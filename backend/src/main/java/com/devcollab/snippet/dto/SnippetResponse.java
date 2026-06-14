package com.devcollab.snippet.dto;

import com.devcollab.snippet.Snippet;
import com.devcollab.user.User;

public record SnippetResponse(
        String id,
        String title,
        String language,
        String code,
        String createdAt,
        long commentCount,
        Author author) {

    public record Author(String id, String displayName, String devTag, String avatarUrl) {}

    public static SnippetResponse of(Snippet s, User author, long commentCount) {
        return new SnippetResponse(
                s.getId().toString(), s.getTitle(), s.getLanguage(), s.getCode(),
                s.getCreatedAt().toString(), commentCount,
                author == null ? null : new Author(
                        author.getId().toString(), author.getDisplayName(),
                        author.getDevTag(), author.getAvatarUrl()));
    }
}
