package com.devcollab.chat;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.chat.dto.MessageResponse;
import com.devcollab.common.error.ApiException;
import com.devcollab.notification.NotificationService;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.WorkspaceGuard;

@Service
public class MessageService {

    private static final Pattern MENTION = Pattern.compile("@([A-Za-z0-9_]{3,30})");

    private final MessageRepository messages;
    private final ChannelService channels;
    private final UserRepository users;
    private final SimpMessagingTemplate broker;
    private final NotificationService notifications;
    private final WorkspaceGuard guard;

    public MessageService(
            MessageRepository messages,
            ChannelService channels,
            UserRepository users,
            SimpMessagingTemplate broker,
            NotificationService notifications,
            WorkspaceGuard guard) {
        this.messages = messages;
        this.channels = channels;
        this.users = users;
        this.broker = broker;
        this.notifications = notifications;
        this.guard = guard;
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> list(UUID channelId, UUID userId) {
        channels.requireAccess(channelId, userId);
        return messages.findTop200ByChannelIdOrderByCreatedAtAsc(channelId).stream()
                .map(m -> users.findById(m.getUserId())
                        .map(u -> MessageResponse.of(m, u))
                        .orElse(null))
                .filter(r -> r != null)
                .toList();
    }

    @Transactional
    public MessageResponse post(UUID channelId, UUID userId, String content) {
        Channel channel = channels.requireAccess(channelId, userId);
        guard.requirePermission(channel.getWorkspaceId(), userId, "answerChannels");
        Message m = new Message();
        m.setChannelId(channelId);
        m.setUserId(userId);
        m.setContent(content.trim());
        messages.save(m);

        User author = users.findById(userId).orElseThrow(() -> ApiException.unauthorized("Not authenticated"));
        MessageResponse response = MessageResponse.of(m, author);
        broker.convertAndSend("/topic/channel." + channelId, response);
        // Broadcast to workspace so all clients can refresh unread counts
        broker.convertAndSend("/topic/workspace." + channel.getWorkspaceId() + ".chat",
                "{\"type\":\"NEW_MESSAGE\",\"channelId\":\"" + channelId + "\"}");

        notify(channel, author, content);
        return response;
    }

    private void notify(Channel channel, User author, String content) {
        UUID ws = channel.getWorkspaceId();
        if ("DM".equals(channel.getType())) {
            for (UUID other : channels.otherParticipants(channel.getId(), author.getId())) {
                notifications.create(other, ws, "chat", "dm",
                        Map.of("title", author.getDisplayName() + " messaged you",
                                "linkType", "chat",
                                "linkId", channel.getId().toString(),
                                "channelId", channel.getId().toString()));
            }
            return;
        }
        if (content.contains("@everyone")) {
            for (UUID other : channels.otherParticipants(channel.getId(), author.getId())) {
                notifications.create(other, ws, "chat", "mention",
                        Map.of("title", author.getDisplayName() + " mentioned everyone in #" + channel.getName(),
                                "linkType", "chat",
                                "linkId", channel.getId().toString(),
                                "channelId", channel.getId().toString()));
            }
        }

        Set<String> tags = new HashSet<>();
        Matcher matcher = MENTION.matcher(content);
        while (matcher.find()) {
            if (!matcher.group(1).equalsIgnoreCase("everyone")) {
                tags.add(matcher.group(1).toLowerCase());
            }
        }
        for (String tag : tags) {
            users.findByDevTag(tag).ifPresent(u -> {
                if (!u.getId().equals(author.getId()) && channels.isParticipant(channel.getId(), u.getId())) {
                    notifications.create(u.getId(), ws, "chat", "mention",
                            Map.of("title", author.getDisplayName() + " mentioned you in #" + channel.getName(),
                                    "linkType", "chat",
                                    "linkId", channel.getId().toString(),
                                    "channelId", channel.getId().toString()));
                }
            });
        }
    }
}
