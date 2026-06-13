package com.devcollab.chat.dto;

import jakarta.validation.constraints.NotBlank;

public record AddChannelMemberRequest(@NotBlank String userId) {}
