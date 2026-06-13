package com.devcollab.ws;

import java.security.Principal;
import java.util.UUID;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.ws.dto.TypingEvent;
import com.devcollab.ws.dto.TypingIn;

@Controller
public class TypingController {

    private final SimpMessagingTemplate broker;
    private final UserRepository users;

    public TypingController(SimpMessagingTemplate broker, UserRepository users) {
        this.broker = broker;
        this.users = users;
    }

    /** Client sends to /app/channel.{id}.typing; we fan out to subscribers. */
    @MessageMapping("/channel.{channelId}.typing")
    public void typing(
            @DestinationVariable String channelId,
            @Payload TypingIn in,
            Principal principal) {
        if (principal == null) return;
        User u = users.findById(UUID.fromString(principal.getName())).orElse(null);
        if (u == null) return;
        broker.convertAndSend(
                "/topic/channel." + channelId + ".typing",
                new TypingEvent(u.getId().toString(), u.getDisplayName(), in.typing()));
    }
}
