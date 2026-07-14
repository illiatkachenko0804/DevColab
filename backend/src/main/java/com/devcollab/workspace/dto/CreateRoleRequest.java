package com.devcollab.workspace.dto;

import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRoleRequest(
        @NotBlank @Size(min = 2, max = 80) String name,
        @Size(max = 300) String description,
        Map<String, Boolean> permissions) {}
