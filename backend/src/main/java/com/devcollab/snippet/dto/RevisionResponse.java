package com.devcollab.snippet.dto;

public record RevisionResponse(
        String id,
        String code,
        String language,
        String message,
        SnippetResponse.Author author,
        String createdAt
) {}
