package com.devcollab.board.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCommentRequest(
    @NotBlank String content
) {}
