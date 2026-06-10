package com.devcollab.auth.dto;

import com.devcollab.user.User;

public record UserResponse(
        String id,
        String email,
        String displayName,
        String avatarUrl,
        boolean emailVerified) {

    public static UserResponse from(User u) {
        return new UserResponse(
                u.getId().toString(),
                u.getEmail(),
                u.getDisplayName(),
                u.getAvatarUrl(),
                u.isEmailVerified());
    }
}
