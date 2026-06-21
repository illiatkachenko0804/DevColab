package com.devcollab.snippet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCollectionRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 7) String color,
        @Size(max = 30) String icon,
        Double position
) {}
