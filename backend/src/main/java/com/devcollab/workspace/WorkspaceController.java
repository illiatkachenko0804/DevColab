package com.devcollab.workspace;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.common.error.ApiException;
import com.devcollab.workspace.dto.CreateWorkspaceRequest;
import com.devcollab.workspace.dto.WorkspaceResponse;

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

    private static UUID currentUser(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UUID id)) {
            throw ApiException.unauthorized("Not authenticated");
        }
        return id;
    }
}
