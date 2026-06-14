package com.devcollab.workspace;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.common.error.ApiException;
import com.devcollab.notification.NotificationService;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.dto.MemberResponse;

@Service
public class MemberService {

    private final MembershipRepository memberships;
    private final UserRepository users;
    private final WorkspaceRepository workspaces;
    private final WorkspaceGuard guard;
    private final NotificationService notifications;

    public MemberService(
            MembershipRepository memberships, UserRepository users, WorkspaceRepository workspaces,
            WorkspaceGuard guard, NotificationService notifications) {
        this.memberships = memberships;
        this.users = users;
        this.workspaces = workspaces;
        this.guard = guard;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> list(UUID workspaceId, UUID requesterId) {
        guard.requireMember(workspaceId, requesterId);
        return memberships.findByWorkspaceIdOrderByJoinedAtAsc(workspaceId).stream()
                .map(m -> users.findById(m.getUserId())
                        .map(u -> MemberResponse.of(u, m.getRole()))
                        .orElse(null))
                .filter(r -> r != null)
                .toList();
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
        guard.requireMember(workspaceId, requesterId);
        User user = resolve(query);
        if (user == null) {
            throw new ApiException(org.springframework.http.HttpStatus.NOT_FOUND,
                    "No DevCollab user matches “" + query.trim() + "”. Ask them to sign up first.");
        }
        if (memberships.existsByWorkspaceIdAndUserId(workspaceId, user.getId())) {
            throw ApiException.conflict(user.getDisplayName() + " is already a member");
        }
        Membership m = new Membership();
        m.setWorkspaceId(workspaceId);
        m.setUserId(user.getId());
        m.setRole("MEMBER");
        memberships.save(m);

        String wsName = workspaces.findById(workspaceId).map(Workspace::getName).orElse("a project");
        notifications.create(user.getId(), workspaceId, "members", "project_invite",
                Map.of("title", "You were added to " + wsName));

        return MemberResponse.of(user, "MEMBER");
    }

    private User resolve(String query) {
        String q = query.trim();
        if (q.contains("@") && !q.startsWith("@")) {
            return users.findByEmailIgnoreCase(q).orElse(null);
        }
        String tag = q.startsWith("@") ? q.substring(1) : q;
        return users.findByDevTag(tag.toLowerCase()).orElse(null);
    }
}
