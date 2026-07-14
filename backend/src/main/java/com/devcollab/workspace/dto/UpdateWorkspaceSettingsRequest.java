package com.devcollab.workspace.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record UpdateWorkspaceSettingsRequest(
        @Size(min = 2, max = 120) String name,
        @Size(max = 140) String slug,
        @Size(max = 500) String description,
        @Size(max = 1000) String avatarUrl,
        @Size(max = 32) String color,
        @Size(max = 16) String taskKeyPrefix,
        String defaultTaskType,
        String defaultTaskPriority,
        @Min(1) @Max(90) Integer defaultSprintDays,
        String invitePolicy,
        String defaultRole) {}
