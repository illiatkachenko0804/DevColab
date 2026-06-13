package com.devcollab.board.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTaskRequest(
        @NotBlank @Size(max = 200) String title,
        String description,
        String assigneeId,
        String due) {}
