package com.devcollab.board.dto;

import jakarta.validation.constraints.NotBlank;

public record MoveTaskRequest(
        @NotBlank String columnId,
        double position) {}
