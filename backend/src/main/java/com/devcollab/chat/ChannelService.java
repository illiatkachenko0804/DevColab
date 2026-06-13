package com.devcollab.chat;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.chat.dto.ChannelMemberResponse;
import com.devcollab.chat.dto.ChannelResponse;
import com.devcollab.common.error.ApiException;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.WorkspaceGuard;

@Service
public class ChannelService {

    private final ChannelRepository channels;
    private final ChannelParticipantRepository participants;
    private final UserRepository users;
    private final WorkspaceGuard guard;

    public ChannelService(
            ChannelRepository channels,
            ChannelParticipantRepository participants,
            UserRepository users,
            WorkspaceGuard guard) {
        this.channels = channels;
        this.participants = participants;
        this.users = users;
        this.guard = guard;
    }

    /** Channels (text + DMs) the caller is a participant of, in this workspace. */
    @Transactional(readOnly = true)
    public List<ChannelResponse> list(UUID workspaceId, UUID userId) {
        guard.requireMember(workspaceId, userId);
        List<ChannelResponse> texts = new ArrayList<>();
        List<ChannelResponse> dms = new ArrayList<>();
        for (ChannelParticipant p : participants.findByUserId(userId)) {
            Channel c = channels.findById(p.getChannelId()).orElse(null);
            if (c == null || !c.getWorkspaceId().equals(workspaceId)) continue;
            if ("DM".equals(c.getType())) {
                User peer = otherParticipant(c.getId(), userId);
                if (peer != null) dms.add(ChannelResponse.dm(c, peer));
            } else {
                texts.add(ChannelResponse.text(c));
            }
        }
        texts.addAll(dms);
        return texts;
    }

    /** New channel starts with just the creator; others are added later. */
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
        channels.save(c);
        addParticipant(c.getId(), userId);
        return ChannelResponse.text(c);
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
        return ChannelResponse.dm(c, peer);
    }

    /** Add an existing project member to a text channel. */
    @Transactional
    public ChannelMemberResponse addMember(UUID channelId, UUID requesterId, UUID targetId) {
        Channel c = requireAccess(channelId, requesterId);
        if ("DM".equals(c.getType())) throw ApiException.badRequest("You can't add people to a direct message");
        guard.requireMember(c.getWorkspaceId(), targetId);
        if (!participants.existsByChannelIdAndUserId(channelId, targetId)) {
            addParticipant(channelId, targetId);
        }
        User u = users.findById(targetId).orElseThrow(() -> ApiException.badRequest("User not found"));
        return ChannelMemberResponse.of(u);
    }

    @Transactional(readOnly = true)
    public List<ChannelMemberResponse> listMembers(UUID channelId, UUID requesterId) {
        requireAccess(channelId, requesterId);
        return participants.findByChannelId(channelId).stream()
                .map(p -> users.findById(p.getUserId()).map(ChannelMemberResponse::of).orElse(null))
                .filter(r -> r != null)
                .toList();
    }

    /** Authorizes a user for a channel (must be a participant) and returns it. */
    @Transactional(readOnly = true)
    public Channel requireAccess(UUID channelId, UUID userId) {
        Channel c = channels.findById(channelId)
                .orElseThrow(() -> ApiException.badRequest("Channel not found"));
        if (!participants.existsByChannelIdAndUserId(channelId, userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "No access to this channel");
        }
        return c;
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
