package com.devcollab.workspace;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.common.error.ApiException;
import com.devcollab.workspace.dto.CreateRoleRequest;
import com.devcollab.workspace.dto.CreateWorkspaceRequest;
import com.devcollab.workspace.dto.RoleResponse;
import com.devcollab.workspace.dto.UpdateRoleRequest;
import com.devcollab.workspace.dto.UpdateWorkspaceSettingsRequest;
import com.devcollab.workspace.dto.WorkspaceResponse;
import com.devcollab.workspace.dto.WorkspaceSettingsResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/workspaces")
public class WorkspaceController {

    private final WorkspaceService service;

    public WorkspaceController(WorkspaceService service) {
        this.service = service;
    }

    @GetMapping
    public List<WorkspaceResponse> mine(Authentication auth) {
        return service.listMine(currentUser(auth));
    }

    @PostMapping
    public ResponseEntity<WorkspaceResponse> create(
            Authentication auth, @Valid @RequestBody CreateWorkspaceRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(currentUser(auth), req));
    }

    @GetMapping("/{workspaceId}/settings")
    public WorkspaceSettingsResponse settings(Authentication auth, @PathVariable UUID workspaceId) {
        return service.settings(workspaceId, currentUser(auth));
    }

    @PatchMapping("/{workspaceId}/settings")
    public WorkspaceSettingsResponse updateSettings(
            Authentication auth,
            @PathVariable UUID workspaceId,
            @Valid @RequestBody UpdateWorkspaceSettingsRequest req) {
        return service.updateSettings(workspaceId, currentUser(auth), req);
    }

    @PostMapping("/{workspaceId}/roles")
    public ResponseEntity<RoleResponse> createRole(
            Authentication auth,
            @PathVariable UUID workspaceId,
            @Valid @RequestBody CreateRoleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createRole(workspaceId, currentUser(auth), req));
    }

    @PatchMapping("/{workspaceId}/roles/{roleId}")
    public RoleResponse updateRole(
            Authentication auth,
            @PathVariable UUID workspaceId,
            @PathVariable UUID roleId,
            @Valid @RequestBody UpdateRoleRequest req) {
        return service.updateRole(workspaceId, currentUser(auth), roleId, req);
    }

    @GetMapping("/{workspaceId}/export")
    public WorkspaceSettingsResponse export(Authentication auth, @PathVariable UUID workspaceId) {
        return service.export(workspaceId, currentUser(auth));
    }

    @PostMapping("/{workspaceId}/archive")
    public WorkspaceSettingsResponse archive(Authentication auth, @PathVariable UUID workspaceId) {
        return service.archive(workspaceId, currentUser(auth));
    }

    @DeleteMapping("/{workspaceId}")
    public ResponseEntity<Void> delete(Authentication auth, @PathVariable UUID workspaceId) {
        service.delete(workspaceId, currentUser(auth));
        return ResponseEntity.noContent().build();
    }

    private static UUID currentUser(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UUID id)) {
            throw ApiException.unauthorized("Not authenticated");
        }
        return id;
    }
}
