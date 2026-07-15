package com.devcollab.auth.dto;

import com.devcollab.user.User;

public record UserResponse(
        String id,
        String email,
        String displayName,
        String devTag,
        String avatarUrl,
        boolean emailVerified,
        boolean hasPassword,
        boolean twoFactorEnabled) {

    public static UserResponse from(User u) {
        return new UserResponse(
                u.getId().toString(),
                u.getEmail(),
                u.getDisplayName(),
                u.getDevTag(),
                u.getAvatarUrl(),
                u.isEmailVerified(),
                u.getPasswordHash() != null,
                u.isTwoFactorEnabled());
    }
}
