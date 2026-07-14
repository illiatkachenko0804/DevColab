package com.devcollab.board;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.devcollab.board.dto.CommentResponse;
import com.devcollab.board.dto.CreateCommentRequest;
import com.devcollab.common.error.ApiException;
import com.devcollab.notification.NotificationService;
import com.devcollab.user.User;
import java.util.Map;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.WorkspaceGuard;
import com.devcollab.activity.ActivityService;

@Service
public class TaskCommentService {

    private final TaskCommentRepository comments;
    private final TaskRepository tasks;
    private final BoardColumnRepository columns;
    private final BoardRepository boards;
    private final UserRepository users;
    private final WorkspaceGuard guard;
    private final SimpMessagingTemplate broker;
    private final NotificationService notifications;
    private final ActivityService activities;

    public TaskCommentService(TaskCommentRepository comments, TaskRepository tasks,
                              BoardColumnRepository columns, BoardRepository boards,
                              UserRepository users, WorkspaceGuard guard, SimpMessagingTemplate broker,
                              NotificationService notifications, ActivityService activities) {
        this.comments = comments;
        this.tasks = tasks;
        this.columns = columns;
        this.boards = boards;
        this.users = users;
        this.guard = guard;
        this.broker = broker;
        this.notifications = notifications;
        this.activities = activities;
    }

    private UUID requireTaskAccess(UUID taskId, UUID userId) {
        Task t = tasks.findById(taskId).orElseThrow(() -> ApiException.badRequest("Task not found"));
        BoardColumn col = columns.findById(t.getColumnId()).orElseThrow();
        Board b = boards.findById(col.getBoardId()).orElseThrow();
        guard.requireMember(b.getWorkspaceId(), userId);
        return b.getWorkspaceId();
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> listComments(UUID taskId, UUID userId) {
        requireTaskAccess(taskId, userId);
        return comments.findByTaskIdOrderByCreatedAtAsc(taskId).stream()
                .map(c -> {
                    User author = users.findById(c.getUserId()).orElse(null);
                    return CommentResponse.of(c, author);
                }).toList();
    }

    @Transactional
    public CommentResponse createComment(UUID taskId, UUID userId, CreateCommentRequest req) {
        UUID wsId = requireTaskAccess(taskId, userId);
        guard.requirePermission(wsId, userId, "comment");
        TaskComment c = new TaskComment();
        c.setTaskId(taskId);
        c.setUserId(userId);
        c.setContent(req.content());
        comments.save(c);
        broadcastCommentUpdate(wsId, taskId);

        User author = users.findById(userId).orElse(null);
        String authorName = author != null ? author.getDisplayName() : "Someone";
        Task t = tasks.findById(taskId).orElse(null);

        if (t != null) {
            if (t.getAssigneeId() != null && !t.getAssigneeId().equals(userId)) {
                notifications.create(t.getAssigneeId(), wsId, "projects", "task_comment",
                        Map.of("title", authorName + " commented on your task", "linkType", "task", "linkId", taskId.toString()));
            }
            if (t.getCreatedBy() != null && !t.getCreatedBy().equals(userId) && !t.getCreatedBy().equals(t.getAssigneeId())) {
                notifications.create(t.getCreatedBy(), wsId, "projects", "task_comment",
                        Map.of("title", authorName + " commented on a task you created", "linkType", "task", "linkId", taskId.toString()));
            }
        }

        notifications.notifyMentions(req.content(), wsId, userId, authorName, "projects", "task", taskId.toString(), "{User.displayName} mentioned you in a task comment");

        activities.log(wsId, userId, "message", "commented", "commented on task \"" + (t != null ? t.getTitle() : "Task") + "\"", taskId.toString());

        return CommentResponse.of(c, author);
    }

    @Transactional
    public void deleteComment(UUID commentId, UUID userId) {
        TaskComment c = comments.findById(commentId)
                .orElseThrow(() -> ApiException.badRequest("Comment not found"));
        if (!c.getUserId().equals(userId)) {
            throw ApiException.badRequest("You can only delete your own comments");
        }
        UUID wsId = requireTaskAccess(c.getTaskId(), userId);
        guard.requirePermission(wsId, userId, "comment");
        comments.delete(c);
        broadcastCommentUpdate(wsId, c.getTaskId());
    }

    @Transactional
    public CommentResponse updateComment(UUID commentId, UUID userId, CreateCommentRequest req) {
        TaskComment c = comments.findById(commentId)
                .orElseThrow(() -> ApiException.badRequest("Comment not found"));
        if (!c.getUserId().equals(userId)) {
            throw ApiException.badRequest("You can only edit your own comments");
        }
        UUID wsId = requireTaskAccess(c.getTaskId(), userId);
        guard.requirePermission(wsId, userId, "comment");
        if (req.content() != null && !req.content().isBlank()) {
            c.setContent(req.content());
            c.setEditedAt(Instant.now());
        }
        comments.save(c);
        broadcastCommentUpdate(wsId, c.getTaskId());
        return CommentResponse.of(c, users.findById(userId).orElse(null));
    }

    private void broadcastCommentUpdate(UUID workspaceId, UUID taskId) {
        broker.convertAndSend("/topic/task." + taskId + ".comments", "{\"type\":\"COMMENT_UPDATE\"}");
        broker.convertAndSend("/topic/workspace." + workspaceId + ".board", "{\"type\":\"BOARD_UPDATE\"}");
    }
}
