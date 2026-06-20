package com.devcollab.board;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.board.dto.CommentResponse;
import com.devcollab.board.dto.CreateCommentRequest;
import com.devcollab.common.error.ApiException;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.WorkspaceGuard;

@Service
public class TaskCommentService {

    private final TaskCommentRepository comments;
    private final TaskRepository tasks;
    private final BoardColumnRepository columns;
    private final BoardRepository boards;
    private final UserRepository users;
    private final WorkspaceGuard guard;

    public TaskCommentService(TaskCommentRepository comments, TaskRepository tasks,
                              BoardColumnRepository columns, BoardRepository boards,
                              UserRepository users, WorkspaceGuard guard) {
        this.comments = comments;
        this.tasks = tasks;
        this.columns = columns;
        this.boards = boards;
        this.users = users;
        this.guard = guard;
    }

    private void requireTaskAccess(UUID taskId, UUID userId) {
        Task t = tasks.findById(taskId).orElseThrow(() -> ApiException.badRequest("Task not found"));
        BoardColumn col = columns.findById(t.getColumnId()).orElseThrow();
        Board b = boards.findById(col.getBoardId()).orElseThrow();
        guard.requireMember(b.getWorkspaceId(), userId);
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
        requireTaskAccess(taskId, userId);
        TaskComment c = new TaskComment();
        c.setTaskId(taskId);
        c.setUserId(userId);
        c.setContent(req.content());
        comments.save(c);
        return CommentResponse.of(c, users.findById(userId).orElse(null));
    }

    @Transactional
    public void deleteComment(UUID commentId, UUID userId) {
        TaskComment c = comments.findById(commentId)
                .orElseThrow(() -> ApiException.badRequest("Comment not found"));
        if (!c.getUserId().equals(userId)) {
            throw ApiException.badRequest("You can only delete your own comments");
        }
        requireTaskAccess(c.getTaskId(), userId);
        comments.delete(c);
    }

    @Transactional
    public CommentResponse updateComment(UUID commentId, UUID userId, CreateCommentRequest req) {
        TaskComment c = comments.findById(commentId)
                .orElseThrow(() -> ApiException.badRequest("Comment not found"));
        if (!c.getUserId().equals(userId)) {
            throw ApiException.badRequest("You can only edit your own comments");
        }
        requireTaskAccess(c.getTaskId(), userId);
        if (req.content() != null && !req.content().isBlank()) {
            c.setContent(req.content());
            c.setEditedAt(Instant.now());
        }
        comments.save(c);
        return CommentResponse.of(c, users.findById(userId).orElse(null));
    }
}
