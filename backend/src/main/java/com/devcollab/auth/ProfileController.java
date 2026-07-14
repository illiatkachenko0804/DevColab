package com.devcollab.auth;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.auth.dto.UpdateProfileRequest;
import com.devcollab.auth.dto.UserResponse;
import com.devcollab.common.error.ApiException;
import com.devcollab.workspace.MembershipRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final AuthService authService;
    private final SimpMessagingTemplate broker;
    private final MembershipRepository memberships;

    public ProfileController(AuthService authService, SimpMessagingTemplate broker, MembershipRepository memberships) {
        this.authService = authService;
        this.broker = broker;
        this.memberships = memberships;
    }

    @PatchMapping
    public ResponseEntity<UserResponse> update(
            Authentication auth, @Valid @RequestBody UpdateProfileRequest req) {
        if (auth == null || !(auth.getPrincipal() instanceof UUID id)) {
            throw ApiException.unauthorized("Not authenticated");
        }
        
        var user = authService.updateProfile(id, req.displayName(), req.devTag(), req.avatarUrl());
        for (var membership : memberships.findByUserIdOrderByJoinedAtAsc(id)) {
            broker.convertAndSend("/topic/workspace/" + membership.getWorkspaceId() + ".members", "{\"type\":\"MEMBER_UPDATED\",\"userId\":\"" + id + "\"}");
        }
        return ResponseEntity.ok(UserResponse.from(user));
    }
}
