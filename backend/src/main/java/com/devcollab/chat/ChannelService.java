package com.devcollab.chat;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.chat.dto.ChannelMemberResponse;
import com.devcollab.chat.dto.ChannelResponse;
import com.devcollab.common.error.ApiException;
import com.devcollab.notification.NotificationService;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.WorkspaceGuard;

@Service
public class ChannelService {

    private final ChannelRepository channels;
    private final ChannelParticipantRepository participants;
    private final ChannelReadRepository reads;
    private final MessageRepository messages;
    private final UserRepository users;
    private final WorkspaceGuard guard;
    private final NotificationService notifications;
    private final MessageService messageService;
    private final SimpMessagingTemplate broker;

    public ChannelService(
            ChannelRepository channels,
            ChannelParticipantRepository participants,
            ChannelReadRepository reads,
            MessageRepository messages,
            UserRepository users,
            WorkspaceGuard guard,
            NotificationService notifications,
            @Lazy MessageService messageService,
            SimpMessagingTemplate broker) {
        this.channels = channels;
        this.participants = participants;
        this.reads = reads;
        this.messages = messages;
        this.users = users;
        this.guard = guard;
        this.notifications = notifications;
        this.messageService = messageService;
        this.broker = broker;
    }

    @Transactional(readOnly = true)
    public List<ChannelResponse> list(UUID workspaceId, UUID userId) {
        guard.requirePermission(workspaceId, userId, "viewApps");
        List<ChannelResponse> texts = new ArrayList<>();
        List<ChannelResponse> dms = new ArrayList<>();
        for (ChannelParticipant p : participants.findByUserId(userId)) {
            Channel c = channels.findById(p.getChannelId()).orElse(null);
            if (c == null || !c.getWorkspaceId().equals(workspaceId)) continue;
            long unread = unread(c.getId(), userId);
            if ("DM".equals(c.getType())) {
                User peer = otherParticipant(c.getId(), userId);
                if (peer != null) dms.add(ChannelResponse.dm(c, peer, unread));
            } else {
                texts.add(ChannelResponse.text(c, unread));
            }
        }
        texts.addAll(dms);
        return texts;
    }

    @Transactional
    public ChannelResponse createText(UUID workspaceId, UUID userId, String rawName) {
        guard.requireMember(workspaceId, userId);
        String name = normalizeName(rawName);
        if (name.isEmpty()) throw ApiException.badRequest("Invalid channel name");
        if (channels.existsByWorkspaceIdAndName(workspaceId, name)) {
            throw ApiException.conflict("A channel named #" + name + " already exists");
        }
        Channel c = new Channel();
        c.setWorkspaceId(workspaceId);
        c.setName(name);
        c.setType("TEXT");
        c.setAdminId(userId);
        channels.save(c);
        addParticipant(c.getId(), userId);
        return ChannelResponse.text(c, 0);
    }

    @Transactional
    public ChannelResponse updateChannel(UUID channelId, UUID userId, com.devcollab.chat.dto.UpdateChannelRequest req) {
        Channel c = channels.findById(channelId).orElseThrow(() -> ApiException.badRequest("Channel not found"));
        if (!userId.equals(c.getAdminId())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Only the channel admin can update these settings");
        }
        
        boolean nameChanged = false;
        boolean imgChanged = false;

        if (req.getName() != null && !req.getName().trim().isEmpty()) {
            String name = normalizeName(req.getName());
            if (!name.equals(c.getName())) {
                if (channels.existsByWorkspaceIdAndName(c.getWorkspaceId(), name)) {
                    throw ApiException.conflict("A channel named #" + name + " already exists");
                }
                c.setName(name);
                nameChanged = true;
            }
        }
        if (req.getDescription() != null) c.setDescription(req.getDescription().trim());
        if (req.getImageUrl() != null && !req.getImageUrl().trim().equals(c.getImageUrl())) {
            c.setImageUrl(req.getImageUrl().trim());
            imgChanged = true;
        }
        
        channels.save(c);

        if (nameChanged) {
            messageService.post(channelId, userId, "[SYSTEM_EVENT] Group name had been changed to #" + c.getName());
        }
        if (imgChanged) {
            messageService.post(channelId, userId, "[SYSTEM_EVENT] Group image had been changed");
        }

        ChannelResponse response = ChannelResponse.text(c, unread(c.getId(), userId));
        broker.convertAndSend("/topic/workspace." + c.getWorkspaceId() + ".channels", response);
        return response;
    }

    @Transactional
    public ChannelResponse findOrCreateDm(UUID workspaceId, UUID userId, UUID targetId) {
        guard.requireMember(workspaceId, userId);
        guard.requireMember(workspaceId, targetId);
        if (userId.equals(targetId)) throw ApiException.badRequest("You can't DM yourself");

        String key = dmKey(userId, targetId);
        Channel c = channels.findByWorkspaceIdAndName(workspaceId, key).orElse(null);
        if (c == null) {
            c = new Channel();
            c.setWorkspaceId(workspaceId);
            c.setName(key);
            c.setType("DM");
            channels.save(c);
            addParticipant(c.getId(), userId);
            addParticipant(c.getId(), targetId);
        }
        User peer = users.findById(targetId).orElseThrow(() -> ApiException.badRequest("User not found"));
        return ChannelResponse.dm(c, peer, unread(c.getId(), userId));
    }

    @Transactional
    public ChannelMemberResponse addMember(UUID channelId, UUID requesterId, UUID targetId) {
        Channel c = requireAccess(channelId, requesterId);
        if (!requesterId.equals(c.getAdminId())) {
            throw ApiException.forbidden("Only channel admins can add members");
        }
        if ("DM".equals(c.getType())) throw ApiException.badRequest("You can't add people to a direct message");
        guard.requireMember(c.getWorkspaceId(), targetId);
        User u = users.findById(targetId).orElseThrow(() -> ApiException.badRequest("User not found"));
        if (!participants.existsByChannelIdAndUserId(channelId, targetId)) {
            addParticipant(channelId, targetId);
            notifications.create(targetId, c.getWorkspaceId(), "chat", "channel_added",
                    Map.of("title", "You were added to #" + c.getName(), "channelId", channelId.toString()));
            
            com.devcollab.chat.dto.MessageResponse.Author sysAuthor = new com.devcollab.chat.dto.MessageResponse.Author("system", "System", "system", null);
            com.devcollab.chat.dto.MessageResponse sysEvent = new com.devcollab.chat.dto.MessageResponse(
                UUID.randomUUID().toString(),
                channelId.toString(),
                "[SYSTEM_EVENT] " + u.getDisplayName() + " was added to group",
                Instant.now().toString(),
                sysAuthor
            );
            broker.convertAndSend("/topic/channel." + channelId, sysEvent);
        }
        return ChannelMemberResponse.of(u);
    }

    @Transactional
    public void removeMember(UUID channelId, UUID requesterId, UUID targetId) {
        Channel c = channels.findById(channelId).orElseThrow(() -> ApiException.badRequest("Channel not found"));
        if (!requesterId.equals(c.getAdminId())) {
            throw ApiException.forbidden("Only the channel admin can remove members");
        }
        if (requesterId.equals(targetId)) {
            throw ApiException.badRequest("You cannot remove yourself");
        }
        User u = users.findById(targetId).orElseThrow(() -> ApiException.badRequest("User not found"));
        participants.deleteByChannelIdAndUserId(channelId, targetId);

        com.devcollab.chat.dto.MessageResponse.Author sysAuthor = new com.devcollab.chat.dto.MessageResponse.Author("system", "System", "system", null);
        com.devcollab.chat.dto.MessageResponse sysEvent = new com.devcollab.chat.dto.MessageResponse(
            UUID.randomUUID().toString(),
            channelId.toString(),
            "[SYSTEM_EVENT] " + u.getDisplayName() + " was removed from group",
            Instant.now().toString(),
            sysAuthor
        );
        broker.convertAndSend("/topic/channel." + channelId, sysEvent);

        broker.convertAndSend("/topic/workspace." + c.getWorkspaceId() + ".channels", 
            Map.of("type", "SYSTEM_KICK", "channelId", channelId.toString(), "userId", targetId.toString()));
    }

    @Transactional(readOnly = true)
    public List<ChannelMemberResponse> listMembers(UUID channelId, UUID requesterId) {
        requireAccess(channelId, requesterId);
        return participants.findByChannelId(channelId).stream()
                .map(p -> users.findById(p.getUserId()).map(ChannelMemberResponse::of).orElse(null))
                .filter(r -> r != null)
                .toList();
    }

    @Transactional
    public void markRead(UUID channelId, UUID userId) {
        requireAccess(channelId, userId);
        ChannelRead r = reads.findByChannelIdAndUserId(channelId, userId).orElseGet(() -> {
            ChannelRead nr = new ChannelRead();
            nr.setChannelId(channelId);
            nr.setUserId(userId);
            return nr;
        });
        r.setLastReadAt(Instant.now());
        reads.save(r);
    }

    @Transactional(readOnly = true)
    public Channel requireAccess(UUID channelId, UUID userId) {
        Channel c = channels.findById(channelId)
                .orElseThrow(() -> ApiException.badRequest("Channel not found"));
        if (!participants.existsByChannelIdAndUserId(channelId, userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "No access to this channel");
        }
        return c;
    }

    /** Participants of a channel other than the given user (for notifications). */
    @Transactional(readOnly = true)
    public List<UUID> otherParticipants(UUID channelId, UUID exceptUserId) {
        return participants.findByChannelId(channelId).stream()
                .map(ChannelParticipant::getUserId)
                .filter(id -> !id.equals(exceptUserId))
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isParticipant(UUID channelId, UUID userId) {
        return participants.existsByChannelIdAndUserId(channelId, userId);
    }

    private long unread(UUID channelId, UUID userId) {
        Instant after = reads.findByChannelIdAndUserId(channelId, userId)
                .map(ChannelRead::getLastReadAt).orElse(Instant.EPOCH);
        return messages.countByChannelIdAndCreatedAtAfterAndUserIdNot(channelId, after, userId);
    }

    private User otherParticipant(UUID channelId, UUID userId) {
        return participants.findByChannelId(channelId).stream()
                .map(ChannelParticipant::getUserId)
                .filter(id -> !id.equals(userId))
                .findFirst()
                .flatMap(users::findById)
                .orElse(null);
    }

    private void addParticipant(UUID channelId, UUID userId) {
        ChannelParticipant p = new ChannelParticipant();
        p.setChannelId(channelId);
        p.setUserId(userId);
        participants.save(p);
    }

    private static String dmKey(UUID a, UUID b) {
        String x = a.toString(), y = b.toString();
        return "dm:" + (x.compareTo(y) < 0 ? x + "_" + y : y + "_" + x);
    }

    private static String normalizeName(String raw) {
        return raw.trim().toLowerCase()
                .replaceAll("[^a-z0-9-_ ]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("(^-|-$)", "");
    }
}
