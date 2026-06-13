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

import com.devcollab.chat.dto.ChannelResponse;
import com.devcollab.chat.dto.CreateChannelRequest;
import com.devcollab.chat.dto.CreateDmRequest;
import com.devcollab.common.web.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}")
public class ChannelController {

    private final ChannelService channels;

    public ChannelController(ChannelService channels) {
        this.channels = channels;
    }

    @GetMapping("/channels")
    public List<ChannelResponse> list(@PathVariable UUID workspaceId, Authentication auth) {
        return channels.list(workspaceId, CurrentUser.id(auth));
    }

    @PostMapping("/channels")
    public ResponseEntity<ChannelResponse> create(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody CreateChannelRequest req,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(channels.createText(workspaceId, CurrentUser.id(auth), req.name()));
    }

    @PostMapping("/dms")
    public ResponseEntity<ChannelResponse> dm(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody CreateDmRequest req,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(channels.findOrCreateDm(workspaceId, CurrentUser.id(auth), UUID.fromString(req.userId())));
    }
}
