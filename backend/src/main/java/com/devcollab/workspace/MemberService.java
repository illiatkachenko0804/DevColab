package com.devcollab.workspace;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.common.error.ApiException;
import com.devcollab.notification.NotificationService;
import com.devcollab.chat.Channel;
import com.devcollab.chat.ChannelParticipant;
import com.devcollab.chat.ChannelParticipantRepository;
import com.devcollab.chat.ChannelRepository;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.dto.MemberResponse;
import com.devcollab.activity.ActivityService;
import com.devcollab.email.EmailService;

@Service
public class MemberService {

    private final MembershipRepository memberships;
    private final UserRepository users;
    private final WorkspaceRepository workspaces;
    private final WorkspaceGuard guard;
    private final NotificationService notifications;
    private final SimpMessagingTemplate broker;
    private final WorkspaceService workspaceService;
    private final ChannelRepository channels;
    private final ChannelParticipantRepository channelParticipants;
    private final ActivityService activities;
    private final WorkspaceInvitationRepository workspaceInvitations;
    private final EmailService emailService;

    public MemberService(
            MembershipRepository memberships, UserRepository users, WorkspaceRepository workspaces,
            WorkspaceGuard guard, NotificationService notifications, SimpMessagingTemplate broker,
            WorkspaceService workspaceService, ChannelRepository channels, ChannelParticipantRepository channelParticipants,
            ActivityService activities, WorkspaceInvitationRepository workspaceInvitations, EmailService emailService) {
        this.memberships = memberships;
        this.users = users;
        this.workspaces = workspaces;
        this.guard = guard;
        this.notifications = notifications;
        this.broker = broker;
        this.workspaceService = workspaceService;
        this.channels = channels;
        this.channelParticipants = channelParticipants;
        this.activities = activities;
        this.workspaceInvitations = workspaceInvitations;
        this.emailService = emailService;
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> list(UUID workspaceId, UUID requesterId) {
        guard.requireMember(workspaceId, requesterId);
        List<MemberResponse> members = new java.util.ArrayList<>(memberships.findByWorkspaceIdOrderByJoinedAtAsc(workspaceId).stream()
                .map(m -> users.findById(m.getUserId())
                        .map(u -> MemberResponse.of(u, m.getRole()))
                        .orElse(null))
                .filter(r -> r != null)
                .toList());

        workspaceInvitations.findByWorkspaceIdOrderByCreatedAtAsc(workspaceId).forEach(inv -> {
            members.add(new MemberResponse("pending-" + inv.getId(), inv.getEmail(), "pending", inv.getEmail(), null, inv.getRole()));
        });
        
        return members;
    }

    /** Members matching a query (name / @tag / email), excluding the requester. For DM search. */
    @Transactional(readOnly = true)
    public List<MemberResponse> search(UUID workspaceId, UUID requesterId, String query) {
        guard.requireMember(workspaceId, requesterId);
        String q = query == null ? "" : query.trim().toLowerCase().replaceFirst("^@", "");
        return list(workspaceId, requesterId).stream()
                .filter(m -> !m.id().equals(requesterId.toString()))
                .filter(m -> q.isEmpty()
                        || m.displayName().toLowerCase().contains(q)
                        || m.devTag().toLowerCase().contains(q)
                        || m.email().toLowerCase().contains(q))
                .toList();
    }

    /** Invite by @devtag or email — resolves to an existing user and adds them. */
    @Transactional
    public MemberResponse invite(UUID workspaceId, UUID requesterId, String query) {
        guard.requirePermission(workspaceId, requesterId, "inviteMembers");
        User user = resolve(query);
        if (user == null) {
            String q = query.trim();
            if (q.contains("@") && !q.startsWith("@") && q.matches("^[\\w.%+-]+@[\\w.-]+\\.[a-zA-Z]{2,}$")) {
                if (workspaceInvitations.existsByWorkspaceIdAndEmailIgnoreCase(workspaceId, q)) {
                    throw ApiException.conflict("An invitation was already sent to " + q);
                }
                WorkspaceInvitation inv = new WorkspaceInvitation();
                inv.setWorkspaceId(workspaceId);
                inv.setEmail(q.toLowerCase());
                inv.setInviterId(requesterId);
                inv.setRole(workspaceService.defaultRoleFor(workspaceId));
                workspaceInvitations.save(inv);
                
                User inviter = users.findById(requesterId).orElse(null);
                String inviterName = inviter != null ? inviter.getDisplayName() : "Someone";
                String wsName = workspaces.findById(workspaceId).map(Workspace::getName).orElse("a project");
                emailService.sendWorkspaceInvitation(q, inviterName, wsName);
                
                return new MemberResponse("pending-" + UUID.randomUUID(), "Pending Invite", "", q.toLowerCase(), null, inv.getRole());
            }
            throw new ApiException(org.springframework.http.HttpStatus.NOT_FOUND,
                    "No DevCollab user matches “" + query.trim() + "”. Ask them to sign up first.");
        }
        if (memberships.existsByWorkspaceIdAndUserId(workspaceId, user.getId())) {
            throw ApiException.conflict(user.getDisplayName() + " is already a member");
        }
        Membership m = new Membership();
        m.setWorkspaceId(workspaceId);
        m.setUserId(user.getId());
        m.setRole(workspaceService.defaultRoleFor(workspaceId));
        memberships.save(m);

        channels.findByWorkspaceIdAndName(workspaceId, "general").ifPresent(general -> {
            if (!channelParticipants.existsByChannelIdAndUserId(general.getId(), user.getId())) {
                ChannelParticipant p = new ChannelParticipant();
                p.setChannelId(general.getId());
                p.setUserId(user.getId());
                channelParticipants.save(p);
            }
        });

        String wsName = workspaces.findById(workspaceId).map(Workspace::getName).orElse("a project");
        notifications.create(user.getId(), workspaceId, "members", "project_invite",
                Map.of("title", "You were added to " + wsName));
        broker.convertAndSend("/topic/workspace." + workspaceId + ".members",
                Map.of("type", "MEMBER_ADDED", "userId", user.getId().toString()));

        activities.log(workspaceId, user.getId(), "join", "joined", "joined the project", user.getId().toString());

        return MemberResponse.of(user, m.getRole());
    }

    @Transactional
    public void remove(UUID workspaceId, UUID requesterId, String targetId) {
        guard.requirePermission(workspaceId, requesterId, "removeMembers");
        
        if (targetId.startsWith("pending-")) {
            UUID invId = UUID.fromString(targetId.substring("pending-".length()));
            workspaceInvitations.deleteByIdAndWorkspaceId(invId, workspaceId);
            broker.convertAndSend("/topic/workspace." + workspaceId + ".members",
                    Map.of("type", "MEMBER_REMOVED", "userId", targetId));
            return;
        }

        UUID targetUuid = UUID.fromString(targetId);
        if (requesterId.equals(targetUuid)) {
            throw ApiException.badRequest("You cannot remove yourself");
        }
        Workspace workspace = workspaces.findById(workspaceId)
                .orElseThrow(() -> ApiException.badRequest("Project not found"));
        if (workspace.getOwnerId().equals(targetUuid)) {
            throw ApiException.forbidden("Project owner cannot be removed");
        }
        Membership membership = memberships.findByWorkspaceIdAndUserId(workspaceId, targetUuid)
                .orElseThrow(() -> ApiException.badRequest("Member not found"));
        if ("ADMIN".equalsIgnoreCase(membership.getRole())) {
            throw ApiException.forbidden("Users with the Admin role cannot be removed");
        }
        memberships.delete(membership);
        
        channels.findByWorkspaceId(workspaceId).forEach(c -> {
            channelParticipants.deleteByChannelIdAndUserId(c.getId(), targetUuid);
        });
        broker.convertAndSend("/topic/workspace." + workspaceId + ".members",
                Map.of("type", "MEMBER_REMOVED", "userId", targetUuid.toString()));

        User author = users.findById(requesterId).orElse(null);
        String authorName = author != null ? author.getDisplayName() : "Someone";
        notifications.create(targetUuid, workspaceId, "members", "project_removed",
                Map.of("title", authorName + " removed you from " + workspace.getName(),
                        "linkType", "project", "linkId", workspaceId.toString()));
    }

    @Transactional
    public void updateRole(UUID workspaceId, UUID requesterId, UUID targetId, com.devcollab.workspace.dto.UpdateMemberRoleRequest req) {
        guard.requirePermission(workspaceId, requesterId, "manageRoles");
        Workspace workspace = workspaces.findById(workspaceId)
                .orElseThrow(() -> ApiException.badRequest("Project not found"));
        if (workspace.getOwnerId().equals(targetId)) {
            throw ApiException.forbidden("Project owner role cannot be changed");
        }

        Membership membership = memberships.findByWorkspaceIdAndUserId(workspaceId, targetId)
                .orElseThrow(() -> ApiException.badRequest("Member not found"));

        if ("ADMIN".equalsIgnoreCase(membership.getRole()) && !"ADMIN".equalsIgnoreCase(req.role())) {
            Membership requesterMembership = memberships.findByWorkspaceIdAndUserId(workspaceId, requesterId).orElse(null);
            if (requesterMembership == null || !"ADMIN".equalsIgnoreCase(requesterMembership.getRole())) {
                throw ApiException.forbidden("Only Admins can change another Admin's role");
            }
        }

        membership.setRole(req.role());
        memberships.save(membership);

        broker.convertAndSend("/topic/workspace." + workspaceId + ".members",
                Map.of("type", "MEMBER_UPDATED", "userId", targetId.toString()));

        User author = users.findById(requesterId).orElse(null);
        String authorName = author != null ? author.getDisplayName() : "Someone";
        notifications.create(targetId, workspaceId, "members", "role_updated",
                Map.of("title", authorName + " updated your role to " + req.role() + " in " + workspace.getName(),
                        "linkType", "project", "linkId", workspaceId.toString()));
    }


    private User resolve(String query) {
        String q = query.trim();
        if (q.contains("@") && !q.startsWith("@")) {
            return users.findByEmailIgnoreCase(q).orElse(null);
        }
        String tag = q.startsWith("@") ? q.substring(1) : q;
        return users.findByDevTag(tag.toLowerCase()).orElse(null);
    }

    @Transactional
    public void applyPendingInvitations(String email, UUID userId) {
        List<WorkspaceInvitation> invites = workspaceInvitations.findByEmailIgnoreCase(email);
        if (invites.isEmpty()) return;

        User user = users.findById(userId).orElse(null);
        if (user == null) return;

        for (WorkspaceInvitation inv : invites) {
            if (!memberships.existsByWorkspaceIdAndUserId(inv.getWorkspaceId(), userId)) {
                Membership m = new Membership();
                m.setWorkspaceId(inv.getWorkspaceId());
                m.setUserId(userId);
                m.setRole(inv.getRole());
                memberships.save(m);

                channels.findByWorkspaceIdAndName(inv.getWorkspaceId(), "general").ifPresent(general -> {
                    if (!channelParticipants.existsByChannelIdAndUserId(general.getId(), userId)) {
                        ChannelParticipant p = new ChannelParticipant();
                        p.setChannelId(general.getId());
                        p.setUserId(userId);
                        channelParticipants.save(p);
                    }
                });

                String wsName = workspaces.findById(inv.getWorkspaceId()).map(Workspace::getName).orElse("a project");
                notifications.create(userId, inv.getWorkspaceId(), "members", "project_invite",
                        Map.of("title", "You were added to " + wsName));
                broker.convertAndSend("/topic/workspace." + inv.getWorkspaceId() + ".members",
                        Map.of("type", "MEMBER_ADDED", "userId", userId.toString()));

                activities.log(inv.getWorkspaceId(), userId, "join", "joined", "joined the project via invitation", userId.toString());
            }
        }
        workspaceInvitations.deleteByEmailIgnoreCase(email);
    }
}
