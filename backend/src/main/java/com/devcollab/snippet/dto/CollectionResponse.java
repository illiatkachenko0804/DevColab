package com.devcollab.snippet.dto;

public record CollectionResponse(
        String id,
        String name,
        String color,
        String icon,
        long snippetCount
) {}
