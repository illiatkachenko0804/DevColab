package com.devcollab.board;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.board.dto.CreateTaskRequest;
import com.devcollab.board.dto.MoveTaskRequest;
import com.devcollab.board.dto.TaskResponse;
import com.devcollab.board.dto.UpdateTaskRequest;
import com.devcollab.common.web.CurrentUser;

import jakarta.validation.Valid;

@RestController
public class TaskController {

    private final BoardService boards;

    public TaskController(BoardService boards) {
        this.boards = boards;
    }

    @PostMapping("/api/columns/{columnId}/tasks")
    public ResponseEntity<TaskResponse> create(
            @PathVariable UUID columnId, @Valid @RequestBody CreateTaskRequest req, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(boards.createTask(columnId, CurrentUser.id(auth), req));
    }

    @PatchMapping("/api/tasks/{taskId}")
    public TaskResponse update(
            @PathVariable UUID taskId, @Valid @RequestBody UpdateTaskRequest req, Authentication auth) {
        return boards.updateTask(taskId, CurrentUser.id(auth), req);
    }

    @PostMapping("/api/tasks/{taskId}/move")
    public TaskResponse move(
            @PathVariable UUID taskId, @Valid @RequestBody MoveTaskRequest req, Authentication auth) {
        return boards.moveTask(taskId, CurrentUser.id(auth), req);
    }

    @DeleteMapping("/api/tasks/{taskId}")
    public ResponseEntity<Void> delete(@PathVariable UUID taskId, Authentication auth) {
        boards.deleteTask(taskId, CurrentUser.id(auth));
        return ResponseEntity.noContent().build();
    }
}
