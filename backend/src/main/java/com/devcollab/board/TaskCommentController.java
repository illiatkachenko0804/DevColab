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

import com.devcollab.board.dto.CommentResponse;
import com.devcollab.board.dto.CreateCommentRequest;
import com.devcollab.common.web.CurrentUser;

import jakarta.validation.Valid;

@RestController
public class TaskCommentController {

    private final TaskCommentService comments;

    public TaskCommentController(TaskCommentService comments) {
        this.comments = comments;
    }

    @GetMapping("/api/tasks/{taskId}/comments")
    public List<CommentResponse> list(@PathVariable UUID taskId, Authentication auth) {
        return comments.listComments(taskId, CurrentUser.id(auth));
    }

    @PostMapping("/api/tasks/{taskId}/comments")
    public ResponseEntity<CommentResponse> create(
            @PathVariable UUID taskId,
            @RequestBody @Valid CreateCommentRequest req,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(comments.createComment(taskId, CurrentUser.id(auth), req));
    }

    @PutMapping("/api/comments/{id}")
    public CommentResponse update(
            @PathVariable UUID id,
            @RequestBody @Valid CreateCommentRequest req,
            Authentication auth) {
        return comments.updateComment(id, CurrentUser.id(auth), req);
    }

    @DeleteMapping("/api/comments/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication auth) {
        comments.deleteComment(id, CurrentUser.id(auth));
        return ResponseEntity.noContent().build();
    }
}
