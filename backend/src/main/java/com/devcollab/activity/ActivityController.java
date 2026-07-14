package com.devcollab.activity;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.activity.dto.ActivityResponse;
import com.devcollab.common.error.ApiException;
import com.devcollab.workspace.WorkspaceGuard;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/activity")
public class ActivityController {

    private final ActivityService service;
    private final WorkspaceGuard guard;

    public ActivityController(ActivityService service, WorkspaceGuard guard) {
        this.service = service;
        this.guard = guard;
    }

    @GetMapping
    public List<ActivityResponse> list(
            Authentication auth,
            @PathVariable UUID workspaceId,
            @RequestParam(defaultValue = "50") int limit) {
        
        guard.requireMember(workspaceId, currentUser(auth));
        return service.list(workspaceId, limit > 100 ? 100 : limit);
    }

    private static UUID currentUser(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UUID id)) {
            throw ApiException.unauthorized("Not authenticated");
        }
        return id;
    }
}
