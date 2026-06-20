package com.devcollab.board;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.board.dto.CreateSprintRequest;
import com.devcollab.board.dto.SprintResponse;
import com.devcollab.board.dto.UpdateSprintRequest;
import com.devcollab.common.web.CurrentUser;

import jakarta.validation.Valid;

@RestController
public class SprintController {

    private final SprintService sprints;

    public SprintController(SprintService sprints) {
        this.sprints = sprints;
    }

    @GetMapping("/api/workspaces/{workspaceId}/sprints")
    public List<SprintResponse> list(@PathVariable UUID workspaceId, Authentication auth) {
        return sprints.listSprints(workspaceId, CurrentUser.id(auth));
    }

    @PostMapping("/api/workspaces/{workspaceId}/sprints")
    public ResponseEntity<SprintResponse> create(
            @PathVariable UUID workspaceId,
            @RequestBody @Valid CreateSprintRequest req,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sprints.createSprint(workspaceId, CurrentUser.id(auth), req));
    }

    @PutMapping("/api/sprints/{id}")
    public SprintResponse update(
            @PathVariable UUID id,
            @RequestBody @Valid UpdateSprintRequest req,
            Authentication auth) {
        return sprints.updateSprint(id, CurrentUser.id(auth), req);
    }

    @DeleteMapping("/api/sprints/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication auth) {
        sprints.deleteSprint(id, CurrentUser.id(auth));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/sprints/{id}/start")
    public SprintResponse start(@PathVariable UUID id, Authentication auth) {
        return sprints.startSprint(id, CurrentUser.id(auth));
    }

    @PostMapping("/api/sprints/{id}/complete")
    public SprintResponse complete(@PathVariable UUID id, Authentication auth) {
        return sprints.completeSprint(id, CurrentUser.id(auth));
    }
}
