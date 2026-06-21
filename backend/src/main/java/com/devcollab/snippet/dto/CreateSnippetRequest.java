package com.devcollab.snippet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateSnippetRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 40) String language,
        @NotBlank @Size(max = 20000) String code,
        String description,
        String collectionId,
        List<String> tags,
        String visibility
) {}
