package com.devcollab.chat.dto;

import com.devcollab.user.User;

public record ChannelMemberResponse(
        String id,
        String displayName,
        String devTag,
        String avatarUrl) {

    public static ChannelMemberResponse of(User u) {
        return new ChannelMemberResponse(
                u.getId().toString(), u.getDisplayName(), u.getDevTag(), u.getAvatarUrl());
    }
}
