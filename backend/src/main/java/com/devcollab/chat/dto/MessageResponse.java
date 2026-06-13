package com.devcollab.chat.dto;

import com.devcollab.chat.Message;
import com.devcollab.user.User;

public record MessageResponse(
        String id,
        String channelId,
        String content,
        String createdAt,
        Author author) {

    public record Author(String id, String displayName, String devTag, String avatarUrl) {}

    public static MessageResponse of(Message m, User u) {
        return new MessageResponse(
                m.getId().toString(),
                m.getChannelId().toString(),
                m.getContent(),
                m.getCreatedAt().toString(),
                new Author(u.getId().toString(), u.getDisplayName(), u.getDevTag(), u.getAvatarUrl()));
    }
}
