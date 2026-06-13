package com.devcollab.chat;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.chat.dto.MessageResponse;
import com.devcollab.chat.dto.SendMessageRequest;
import com.devcollab.common.web.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/channels/{channelId}/messages")
public class MessageController {

    private final MessageService messages;

    public MessageController(MessageService messages) {
        this.messages = messages;
    }

    @GetMapping
    public List<MessageResponse> list(@PathVariable UUID channelId, Authentication auth) {
        return messages.list(channelId, CurrentUser.id(auth));
    }

    @PostMapping
    public ResponseEntity<MessageResponse> send(
            @PathVariable UUID channelId,
            @Valid @RequestBody SendMessageRequest req,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(messages.post(channelId, CurrentUser.id(auth), req.content()));
    }
}
