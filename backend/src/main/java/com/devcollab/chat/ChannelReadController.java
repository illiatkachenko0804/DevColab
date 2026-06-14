package com.devcollab.chat;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.common.web.CurrentUser;

@RestController
public class ChannelReadController {

    private final ChannelService channels;

    public ChannelReadController(ChannelService channels) {
        this.channels = channels;
    }

    @PostMapping("/api/channels/{channelId}/read")
    public ResponseEntity<Void> read(@PathVariable UUID channelId, Authentication auth) {
        channels.markRead(channelId, CurrentUser.id(auth));
        return ResponseEntity.noContent().build();
    }
}
