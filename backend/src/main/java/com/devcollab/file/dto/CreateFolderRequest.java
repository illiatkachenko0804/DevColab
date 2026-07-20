package com.devcollab.file.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateFolderRequest(
        @NotBlank @Size(max = 100) String name,
        UUID parentId,
        String accessType, // "PUBLIC", "PRIVATE", "INHERIT"
        List<UUID> allowedUsers) {}
