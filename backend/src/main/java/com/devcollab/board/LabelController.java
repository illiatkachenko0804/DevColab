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

import com.devcollab.board.dto.CreateLabelRequest;
import com.devcollab.board.dto.LabelResponse;
import com.devcollab.common.web.CurrentUser;

import jakarta.validation.Valid;

@RestController
public class LabelController {

    private final LabelService labels;

    public LabelController(LabelService labels) {
        this.labels = labels;
    }

    @GetMapping("/api/workspaces/{workspaceId}/labels")
    public List<LabelResponse> list(@PathVariable UUID workspaceId, Authentication auth) {
        return labels.listLabels(workspaceId, CurrentUser.id(auth));
    }

    @PostMapping("/api/workspaces/{workspaceId}/labels")
    public ResponseEntity<LabelResponse> create(
            @PathVariable UUID workspaceId,
            @RequestBody @Valid CreateLabelRequest req,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(labels.createLabel(workspaceId, CurrentUser.id(auth), req));
    }

    @PutMapping("/api/labels/{id}")
    public LabelResponse update(
            @PathVariable UUID id,
            @RequestBody CreateLabelRequest req,
            Authentication auth) {
        return labels.updateLabel(id, CurrentUser.id(auth), req);
    }

    @DeleteMapping("/api/labels/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication auth) {
        labels.deleteLabel(id, CurrentUser.id(auth));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/tasks/{taskId}/labels/{labelId}")
    public ResponseEntity<Void> attach(
            @PathVariable UUID taskId,
            @PathVariable UUID labelId,
            Authentication auth) {
        labels.attachLabel(taskId, labelId, CurrentUser.id(auth));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/tasks/{taskId}/labels/{labelId}")
    public ResponseEntity<Void> detach(
            @PathVariable UUID taskId,
            @PathVariable UUID labelId,
            Authentication auth) {
        labels.detachLabel(taskId, labelId, CurrentUser.id(auth));
        return ResponseEntity.noContent().build();
    }
}
