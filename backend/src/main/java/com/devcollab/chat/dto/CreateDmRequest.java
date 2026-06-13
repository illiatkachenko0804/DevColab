package com.devcollab.chat.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateDmRequest(@NotBlank String userId) {}
