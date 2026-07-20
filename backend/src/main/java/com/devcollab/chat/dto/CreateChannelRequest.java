package com.devcollab.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateChannelRequest(
        @NotBlank @Size(min = 1, max = 80, message = "Channel name must be 1–80 characters") String name,
        String description,
        String imageUrl) {}
