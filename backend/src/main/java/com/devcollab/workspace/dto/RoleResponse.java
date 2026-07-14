package com.devcollab.workspace.dto;

import java.util.Map;

public record RoleResponse(
        String id,
        String name,
        String description,
        String systemKey,
        Map<String, Boolean> permissions) {}
