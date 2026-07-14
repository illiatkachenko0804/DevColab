package com.devcollab.workspace.dto;

import java.util.List;

public record WorkspaceSettingsResponse(
        String id,
        String name,
        String slug,
        String description,
        String avatarUrl,
        String color,
        String taskKeyPrefix,
        String defaultTaskType,
        String defaultTaskPriority,
        Integer defaultSprintDays,
        String invitePolicy,
        String defaultRole,
        boolean archived,
        List<RoleResponse> roles) {}
