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

import com.devcollab.chat.dto.AddChannelMemberRequest;
import com.devcollab.chat.dto.ChannelMemberResponse;
import com.devcollab.common.web.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/channels/{channelId}/members")
public class ChannelMembersController {

    private final ChannelService channels;

    public ChannelMembersController(ChannelService channels) {
        this.channels = channels;
    }

    @GetMapping
    public List<ChannelMemberResponse> list(@PathVariable UUID channelId, Authentication auth) {
        return channels.listMembers(channelId, CurrentUser.id(auth));
    }

    @PostMapping
    public ResponseEntity<ChannelMemberResponse> add(
            @PathVariable UUID channelId,
            @Valid @RequestBody AddChannelMemberRequest req,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(channels.addMember(channelId, CurrentUser.id(auth), UUID.fromString(req.userId())));
    }
}
