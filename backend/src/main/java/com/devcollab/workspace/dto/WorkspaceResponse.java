package com.devcollab.workspace.dto;

import com.devcollab.workspace.Workspace;
import java.util.Map;

public record WorkspaceResponse(
        String id,
        String name,
        String slug,
        String description,
        String role,
        Map<String, Boolean> permissions) {

    public static WorkspaceResponse from(Workspace w, String role, Map<String, Boolean> permissions) {
        return new WorkspaceResponse(
                w.getId().toString(), w.getName(), w.getSlug(), w.getDescription(), role, permissions);
    }
}
