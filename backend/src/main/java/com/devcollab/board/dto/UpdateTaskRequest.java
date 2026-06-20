package com.devcollab.board.dto;

import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Partial update. A null field is left unchanged; an empty string clears
 * assignee / due / description / sprintId / parentId.
 */
public record UpdateTaskRequest(
        @Size(max = 200) String title,
        String description,
        String type,
        String priority,
        Integer storyPoints,
        String sprintId,
        String parentId,
        String assigneeId,
        String due,
        List<String> labelIds) {}
