package com.devcollab.snippet.dto;

import java.util.List;
import jakarta.validation.constraints.Size;

public record UpdateSnippetRequest(
        @Size(max = 200) String title,
        @Size(max = 40) String language,
        @Size(max = 20000) String code,
        String description,
        String collectionId,
        List<String> tags,
        Boolean pinned,
        String visibility
) {}
