package com.devcollab.board.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateTaskRequest(
        @NotBlank @Size(max = 200) String title,
        String description,
        String type,
        String priority,
        Integer storyPoints,
        String sprintId,
        String parentId,
        String assigneeId,
        String due,
        List<String> labelIds) {}
