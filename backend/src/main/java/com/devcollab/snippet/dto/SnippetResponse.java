package com.devcollab.snippet.dto;

import java.util.List;
import com.devcollab.snippet.Snippet;
import com.devcollab.user.User;
import com.devcollab.snippet.SnippetTag;

public record SnippetResponse(
        String id,
        String title,
        String language,
        String code,
        String description,
        String collectionId,
        String collectionName,
        ForkedFrom forkedFrom,
        boolean pinned,
        String visibility,
        boolean starred,
        long starCount,
        List<String> tags,
        String createdAt,
        String updatedAt,
        long commentCount,
        Author author) {

    public record Author(String id, String displayName, String devTag, String avatarUrl) {}
    public record ForkedFrom(String id, String title) {}

    public static SnippetResponse of(
            Snippet s, User author, long commentCount, 
            String collectionName, Snippet forkedSnippet, 
            boolean starred, long starCount) {
        
        List<String> tagList = s.getTags().stream().map(SnippetTag::getName).toList();
        
        return new SnippetResponse(
                s.getId().toString(), s.getTitle(), s.getLanguage(), s.getCode(),
                s.getDescription(),
                s.getCollectionId() != null ? s.getCollectionId().toString() : null,
                collectionName,
                forkedSnippet != null ? new ForkedFrom(forkedSnippet.getId().toString(), forkedSnippet.getTitle()) : null,
                s.getPinned(),
                s.getVisibility(),
                starred,
                starCount,
                tagList,
                s.getCreatedAt().toString(),
                s.getUpdatedAt().toString(),
                commentCount,
                author == null ? null : new Author(
                        author.getId().toString(), author.getDisplayName(),
                        author.getDevTag(), author.getAvatarUrl()));
    }
}
