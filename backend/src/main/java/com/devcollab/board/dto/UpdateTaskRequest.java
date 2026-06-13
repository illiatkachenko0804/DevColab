package com.devcollab.board.dto;

import jakarta.validation.constraints.Size;

/**
 * Partial update. A null field is left unchanged; an empty string clears
 * assignee / due / description.
 */
public record UpdateTaskRequest(
        @Size(max = 200) String title,
        String description,
        String assigneeId,
        String due) {}
