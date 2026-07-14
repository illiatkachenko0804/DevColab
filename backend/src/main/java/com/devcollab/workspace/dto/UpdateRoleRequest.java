package com.devcollab.workspace.dto;

import java.util.Map;

import jakarta.validation.constraints.Size;

public record UpdateRoleRequest(
        @Size(min = 2, max = 40) String name,
        @Size(max = 240) String description,
        Map<String, Boolean> permissions) {}
