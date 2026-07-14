package com.devcollab.board;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.devcollab.board.dto.CreateLabelRequest;
import com.devcollab.board.dto.LabelResponse;
import com.devcollab.common.error.ApiException;
import com.devcollab.workspace.WorkspaceGuard;

@Service
public class LabelService {

    private final LabelRepository labels;
    private final WorkspaceGuard guard;
    private final TaskRepository tasks;
    private final SimpMessagingTemplate broker;

    public LabelService(LabelRepository labels, WorkspaceGuard guard, TaskRepository tasks, SimpMessagingTemplate broker) {
        this.labels = labels;
        this.guard = guard;
        this.tasks = tasks;
        this.broker = broker;
    }

    @Transactional(readOnly = true)
    public List<LabelResponse> listLabels(UUID workspaceId, UUID userId) {
        guard.requirePermission(workspaceId, userId, "viewApps");
        return labels.findByWorkspaceId(workspaceId).stream()
                .map(LabelResponse::of).toList();
    }

    @Transactional
    public LabelResponse createLabel(UUID workspaceId, UUID userId, CreateLabelRequest req) {
        guard.requirePermission(workspaceId, userId, "manageTasks");
        Label l = new Label();
        l.setWorkspaceId(workspaceId);
        l.setName(req.name());
        l.setColor(req.color());
        labels.save(l);
        broadcastBoardUpdate(l.getWorkspaceId());
        return LabelResponse.of(l);
    }

    @Transactional
    public void deleteLabel(UUID labelId, UUID userId) {
        Label l = labels.findById(labelId)
                .orElseThrow(() -> ApiException.badRequest("Label not found"));
        guard.requirePermission(l.getWorkspaceId(), userId, "manageTasks");
        labels.delete(l);
        broadcastBoardUpdate(l.getWorkspaceId());
    }

    @Transactional
    public LabelResponse updateLabel(UUID labelId, UUID userId, CreateLabelRequest req) {
        Label l = labels.findById(labelId)
                .orElseThrow(() -> ApiException.badRequest("Label not found"));
        guard.requirePermission(l.getWorkspaceId(), userId, "manageTasks");
        if (req.name() != null) l.setName(req.name());
        if (req.color() != null) l.setColor(req.color());
        labels.save(l);
        broadcastBoardUpdate(l.getWorkspaceId());
        return LabelResponse.of(l);
    }

    @Transactional
    public void attachLabel(UUID taskId, UUID labelId, UUID userId) {
        Task t = tasks.findById(taskId).orElseThrow(() -> ApiException.badRequest("Task not found"));
        Label l = labels.findById(labelId).orElseThrow(() -> ApiException.badRequest("Label not found"));
        guard.requirePermission(l.getWorkspaceId(), userId, "manageTasks");
        t.getLabels().add(l);
        tasks.save(t);
        broadcastBoardUpdate(l.getWorkspaceId());
    }

    @Transactional
    public void detachLabel(UUID taskId, UUID labelId, UUID userId) {
        Task t = tasks.findById(taskId).orElseThrow(() -> ApiException.badRequest("Task not found"));
        Label l = labels.findById(labelId).orElseThrow(() -> ApiException.badRequest("Label not found"));
        guard.requirePermission(l.getWorkspaceId(), userId, "manageTasks");
        t.getLabels().remove(l);
        tasks.save(t);
        broadcastBoardUpdate(l.getWorkspaceId());
    }

    private void broadcastBoardUpdate(UUID workspaceId) {
        broker.convertAndSend("/topic/workspace." + workspaceId + ".board", "{\"type\":\"BOARD_UPDATE\"}");
    }
}
