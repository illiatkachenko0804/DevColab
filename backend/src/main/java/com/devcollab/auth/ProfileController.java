package com.devcollab.auth;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.auth.dto.UpdateProfileRequest;
import com.devcollab.auth.dto.UserResponse;
import com.devcollab.common.error.ApiException;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final AuthService authService;

    public ProfileController(AuthService authService) {
        this.authService = authService;
    }

    @PatchMapping
    public ResponseEntity<UserResponse> update(
            Authentication auth, @Valid @RequestBody UpdateProfileRequest req) {
        if (auth == null || !(auth.getPrincipal() instanceof UUID id)) {
            throw ApiException.unauthorized("Not authenticated");
        }
        return ResponseEntity.ok(
                UserResponse.from(authService.updateProfile(id, req.displayName(), req.devTag())));
    }
}
