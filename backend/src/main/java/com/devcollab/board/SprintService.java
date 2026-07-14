package com.devcollab.board;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.devcollab.board.dto.CreateSprintRequest;
import com.devcollab.board.dto.SprintResponse;
import com.devcollab.board.dto.UpdateSprintRequest;
import com.devcollab.common.error.ApiException;
import com.devcollab.workspace.WorkspaceGuard;
import com.devcollab.notification.NotificationService;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.MembershipRepository;
import java.util.Map;
import com.devcollab.activity.ActivityService;

@Service
public class SprintService {

    private final SprintRepository sprints;
    private final WorkspaceGuard guard;
    private final SimpMessagingTemplate broker;
    private final NotificationService notifications;
    private final UserRepository users;
    private final MembershipRepository memberships;
    private final ActivityService activities;

    public SprintService(SprintRepository sprints, WorkspaceGuard guard, SimpMessagingTemplate broker,
                         NotificationService notifications, UserRepository users, MembershipRepository memberships,
                         ActivityService activities) {
        this.sprints = sprints;
        this.guard = guard;
        this.broker = broker;
        this.notifications = notifications;
        this.users = users;
        this.memberships = memberships;
        this.activities = activities;
    }

    private SprintResponse toResponse(Sprint s) {
        // We'll pass 0s for now, to implement real counting later or in TaskRepository
        return SprintResponse.of(s, 0, 0, 0, 0);
    }

    @Transactional(readOnly = true)
    public List<SprintResponse> listSprints(UUID workspaceId, UUID userId) {
        guard.requirePermission(workspaceId, userId, "viewApps");
        return sprints.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).stream()
                .map(this::toResponse).toList();
    }

    @Transactional
    public SprintResponse createSprint(UUID workspaceId, UUID userId, CreateSprintRequest req) {
        guard.requirePermission(workspaceId, userId, "manageSprints");
        Sprint s = new Sprint();
        s.setWorkspaceId(workspaceId);
        s.setName(req.name());
        s.setGoal(req.goal());
        if (req.startDate() != null) s.setStartDate(java.time.LocalDate.parse(req.startDate()));
        if (req.endDate() != null) s.setEndDate(java.time.LocalDate.parse(req.endDate()));
        sprints.save(s);
        broadcastSprintsUpdate(s.getWorkspaceId());
        return toResponse(s);
    }

    @Transactional
    public SprintResponse updateSprint(UUID sprintId, UUID userId, UpdateSprintRequest req) {
        Sprint s = sprints.findById(sprintId)
                .orElseThrow(() -> ApiException.badRequest("Sprint not found"));
        guard.requirePermission(s.getWorkspaceId(), userId, "manageSprints");
        if (req.name() != null) s.setName(req.name());
        if (req.goal() != null) s.setGoal(req.goal());
        if (req.status() != null) s.setStatus(req.status());
        if (req.startDate() != null) s.setStartDate(java.time.LocalDate.parse(req.startDate()));
        if (req.endDate() != null) s.setEndDate(java.time.LocalDate.parse(req.endDate()));
        sprints.save(s);
        broadcastSprintsUpdate(s.getWorkspaceId());
        return toResponse(s);
    }

    @Transactional
    public void deleteSprint(UUID sprintId, UUID userId) {
        Sprint s = sprints.findById(sprintId)
                .orElseThrow(() -> ApiException.badRequest("Sprint not found"));
        guard.requirePermission(s.getWorkspaceId(), userId, "manageSprints");
        sprints.delete(s);
        broadcastSprintsUpdate(s.getWorkspaceId());
    }

    @Transactional
    public SprintResponse startSprint(UUID sprintId, UUID userId) {
        Sprint s = sprints.findById(sprintId)
                .orElseThrow(() -> ApiException.badRequest("Sprint not found"));
        guard.requirePermission(s.getWorkspaceId(), userId, "manageSprints");
        s.setStatus("ACTIVE");
        sprints.save(s);
        broadcastSprintsUpdate(s.getWorkspaceId());

        User author = users.findById(userId).orElse(null);
        String authorName = author != null ? author.getDisplayName() : "Someone";
        
        memberships.findByWorkspaceIdOrderByJoinedAtAsc(s.getWorkspaceId()).forEach(m -> {
            if (!m.getUserId().equals(userId)) {
                notifications.create(m.getUserId(), s.getWorkspaceId(), "projects", "sprint_started",
                        Map.of("title", authorName + " started sprint: " + s.getName(),
                                "linkType", "project", "linkId", s.getWorkspaceId().toString()));
            }
        });

        activities.log(s.getWorkspaceId(), userId, "board", "started", "started sprint \"" + s.getName() + "\"", s.getId().toString());

        return toResponse(s);
    }

    @Transactional
    public SprintResponse completeSprint(UUID sprintId, UUID userId) {
        Sprint s = sprints.findById(sprintId)
                .orElseThrow(() -> ApiException.badRequest("Sprint not found"));
        guard.requirePermission(s.getWorkspaceId(), userId, "manageSprints");
        s.setStatus("COMPLETED");
        sprints.save(s);
        broadcastSprintsUpdate(s.getWorkspaceId());
        // Note: Moving tasks to backlog will be implemented in BoardService later if needed.
        return toResponse(s);
    }

    private void broadcastSprintsUpdate(UUID workspaceId) {
        broker.convertAndSend("/topic/workspace." + workspaceId + ".sprints", "{\"type\":\"SPRINTS_UPDATE\"}");
    }
}
