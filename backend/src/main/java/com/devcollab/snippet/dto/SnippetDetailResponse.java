package com.devcollab.snippet.dto;

import java.util.List;

public record SnippetDetailResponse(
        SnippetResponse snippet,
        List<SnippetCommentResponse> comments) {}
