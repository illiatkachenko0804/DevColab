package com.devcollab.workspace.dto;

import com.devcollab.workspace.Workspace;

public record WorkspaceResponse(
        String id,
        String name,
        String slug,
        String description,
        String role) {

    public static WorkspaceResponse from(Workspace w, String role) {
        return new WorkspaceResponse(
                w.getId().toString(), w.getName(), w.getSlug(), w.getDescription(), role);
    }
}
