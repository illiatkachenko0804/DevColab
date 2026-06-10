package com.devcollab.workspace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateWorkspaceRequest(
        @NotBlank @Size(min = 2, max = 120, message = "Name must be 2–120 characters") String name,
        @Size(max = 500, message = "Description is too long") String description) {}
