package com.devcollab.chat;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    /** Text channels in the workspace + the caller's DMs. */
    @Transactional(readOnly = true)
    public List<ChannelResponse> list(UUID workspaceId, UUID userId) {
        guard.requireMember(workspaceId, userId);
        List<ChannelResponse> out = new ArrayList<>();

        channels.findByWorkspaceIdAndTypeOrderByCreatedAtAsc(workspaceId, "TEXT")
                .forEach(c -> out.add(ChannelResponse.text(c)));

        for (ChannelParticipant p : participants.findByUserId(userId)) {
            Channel c = channels.findById(p.getChannelId()).orElse(null);
            if (c == null || !"DM".equals(c.getType()) || !c.getWorkspaceId().equals(workspaceId)) continue;
            User peer = otherParticipant(c.getId(), userId);
            if (peer != null) out.add(ChannelResponse.dm(c, peer));
        }
        return out;
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
        channels.save(c);
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

    /** Authorizes a user for a channel and returns the channel. */
    @Transactional(readOnly = true)
    public Channel requireAccess(UUID channelId, UUID userId) {
        Channel c = channels.findById(channelId)
                .orElseThrow(() -> ApiException.badRequest("Channel not found"));
        if ("DM".equals(c.getType())) {
            if (!participants.existsByChannelIdAndUserId(channelId, userId)) {
                throw new ApiException(org.springframework.http.HttpStatus.FORBIDDEN, "No access to this conversation");
            }
        } else {
            guard.requireMember(c.getWorkspaceId(), userId);
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
