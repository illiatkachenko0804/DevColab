package com.devcollab.workspace.dto;

import com.devcollab.user.User;

public record MemberResponse(
        String id,
        String displayName,
        String devTag,
        String email,
        String avatarUrl,
        String role) {

    public static MemberResponse of(User u, String role) {
        return new MemberResponse(
                u.getId().toString(), u.getDisplayName(), u.getDevTag(),
                u.getEmail(), u.getAvatarUrl(), role);
    }
}
