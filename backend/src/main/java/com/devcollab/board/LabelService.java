package com.devcollab.board;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.board.dto.CreateLabelRequest;
import com.devcollab.board.dto.LabelResponse;
import com.devcollab.common.error.ApiException;
import com.devcollab.workspace.WorkspaceGuard;

@Service
public class LabelService {

    private final LabelRepository labels;
    private final WorkspaceGuard guard;
    private final TaskRepository tasks;

    public LabelService(LabelRepository labels, WorkspaceGuard guard, TaskRepository tasks) {
        this.labels = labels;
        this.guard = guard;
        this.tasks = tasks;
    }

    @Transactional(readOnly = true)
    public List<LabelResponse> listLabels(UUID workspaceId, UUID userId) {
        guard.requireMember(workspaceId, userId);
        return labels.findByWorkspaceId(workspaceId).stream()
                .map(LabelResponse::of).toList();
    }

    @Transactional
    public LabelResponse createLabel(UUID workspaceId, UUID userId, CreateLabelRequest req) {
        guard.requireMember(workspaceId, userId);
        Label l = new Label();
        l.setWorkspaceId(workspaceId);
        l.setName(req.name());
        l.setColor(req.color());
        labels.save(l);
        return LabelResponse.of(l);
    }

    @Transactional
    public void deleteLabel(UUID labelId, UUID userId) {
        Label l = labels.findById(labelId)
                .orElseThrow(() -> ApiException.badRequest("Label not found"));
        guard.requireMember(l.getWorkspaceId(), userId);
        labels.delete(l);
    }

    @Transactional
    public LabelResponse updateLabel(UUID labelId, UUID userId, CreateLabelRequest req) {
        Label l = labels.findById(labelId)
                .orElseThrow(() -> ApiException.badRequest("Label not found"));
        guard.requireMember(l.getWorkspaceId(), userId);
        if (req.name() != null) l.setName(req.name());
        if (req.color() != null) l.setColor(req.color());
        labels.save(l);
        return LabelResponse.of(l);
    }

    @Transactional
    public void attachLabel(UUID taskId, UUID labelId, UUID userId) {
        Task t = tasks.findById(taskId).orElseThrow(() -> ApiException.badRequest("Task not found"));
        Label l = labels.findById(labelId).orElseThrow(() -> ApiException.badRequest("Label not found"));
        guard.requireMember(l.getWorkspaceId(), userId);
        t.getLabels().add(l);
        tasks.save(t);
    }

    @Transactional
    public void detachLabel(UUID taskId, UUID labelId, UUID userId) {
        Task t = tasks.findById(taskId).orElseThrow(() -> ApiException.badRequest("Task not found"));
        Label l = labels.findById(labelId).orElseThrow(() -> ApiException.badRequest("Label not found"));
        guard.requireMember(l.getWorkspaceId(), userId);
        t.getLabels().remove(l);
        tasks.save(t);
    }
}
