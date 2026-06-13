package com.devcollab.chat;

import java.util.List;
import java.util.UUID;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.chat.dto.MessageResponse;
import com.devcollab.common.error.ApiException;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;

@Service
public class MessageService {

    private final MessageRepository messages;
    private final ChannelService channels;
    private final UserRepository users;
    private final SimpMessagingTemplate broker;

    public MessageService(
            MessageRepository messages,
            ChannelService channels,
            UserRepository users,
            SimpMessagingTemplate broker) {
        this.messages = messages;
        this.channels = channels;
        this.users = users;
        this.broker = broker;
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
        channels.requireAccess(channelId, userId);
        Message m = new Message();
        m.setChannelId(channelId);
        m.setUserId(userId);
        m.setContent(content.trim());
        messages.save(m);
        User author = users.findById(userId).orElseThrow(() -> ApiException.unauthorized("Not authenticated"));
        MessageResponse response = MessageResponse.of(m, author);
        broker.convertAndSend("/topic/channel." + channelId, response);
        return response;
    }
}
