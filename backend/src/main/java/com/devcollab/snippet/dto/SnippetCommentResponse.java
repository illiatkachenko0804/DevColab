package com.devcollab.snippet.dto;

import com.devcollab.snippet.SnippetComment;
import com.devcollab.user.User;

public record SnippetCommentResponse(
        String id,
        String content,
        String createdAt,
        Author author) {

    public record Author(String id, String displayName, String devTag, String avatarUrl) {}

    public static SnippetCommentResponse of(SnippetComment c, User author) {
        return new SnippetCommentResponse(
                c.getId().toString(), c.getContent(), c.getCreatedAt().toString(),
                author == null ? null : new Author(
                        author.getId().toString(), author.getDisplayName(),
                        author.getDevTag(), author.getAvatarUrl()));
    }
}
