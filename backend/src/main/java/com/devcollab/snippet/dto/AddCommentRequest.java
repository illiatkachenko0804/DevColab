package com.devcollab.snippet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddCommentRequest(@NotBlank @Size(max = 2000) String content) {}
