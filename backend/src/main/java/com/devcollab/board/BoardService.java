package com.devcollab.board;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.board.dto.BoardResponse;
import com.devcollab.board.dto.ColumnResponse;
import com.devcollab.board.dto.CreateTaskRequest;
import com.devcollab.board.dto.MoveTaskRequest;
import com.devcollab.board.dto.TaskResponse;
import com.devcollab.board.dto.UpdateTaskRequest;
import com.devcollab.common.error.ApiException;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.WorkspaceGuard;

@Service
public class BoardService {

    private final BoardRepository boards;
    private final BoardColumnRepository columns;
    private final TaskRepository tasks;
    private final UserRepository users;
    private final WorkspaceGuard guard;

    public BoardService(
            BoardRepository boards, BoardColumnRepository columns, TaskRepository tasks,
            UserRepository users, WorkspaceGuard guard) {
        this.boards = boards;
        this.columns = columns;
        this.tasks = tasks;
        this.users = users;
        this.guard = guard;
    }

    /** Seeds a default board with Todo / In Progress / Done. Called on workspace creation. */
    @Transactional
    public void createDefaultBoard(UUID workspaceId) {
        Board b = new Board();
        b.setWorkspaceId(workspaceId);
        b.setName("Tasks");
        boards.save(b);
        addColumn(b.getId(), "Todo", 1000);
        addColumn(b.getId(), "In Progress", 2000);
        addColumn(b.getId(), "Done", 3000);
    }

    @Transactional
    public BoardResponse getBoard(UUID workspaceId, UUID userId) {
        guard.requireMember(workspaceId, userId);
        Board board = boards.findByWorkspaceIdOrderByCreatedAtAsc(workspaceId).stream()
                .findFirst()
                .orElseGet(() -> {
                    createDefaultBoard(workspaceId);
                    return boards.findByWorkspaceIdOrderByCreatedAtAsc(workspaceId).get(0);
                });
        List<ColumnResponse> cols = columns.findByBoardIdOrderByPositionAsc(board.getId()).stream()
                .map(c -> new ColumnResponse(
                        c.getId().toString(), c.getName(), c.getPosition(),
                        tasks.findByColumnIdOrderByPositionAsc(c.getId()).stream()
                                .map(this::toResponse).toList()))
                .toList();
        return new BoardResponse(board.getId().toString(), board.getName(), cols);
    }

    @Transactional
    public TaskResponse createTask(UUID columnId, UUID userId, CreateTaskRequest req) {
        requireColumnMember(columnId, userId);
        double max = tasks.findByColumnIdOrderByPositionAsc(columnId).stream()
                .mapToDouble(Task::getPosition).max().orElse(0);
        Task t = new Task();
        t.setColumnId(columnId);
        t.setTitle(req.title().trim());
        t.setDescription(blankToNull(req.description()));
        t.setAssigneeId(parseUser(req.assigneeId()));
        t.setDueDate(parseDate(req.due()));
        t.setPosition(max + 1000);
        t.setCreatedBy(userId);
        tasks.save(t);
        return toResponse(t);
    }

    @Transactional
    public TaskResponse updateTask(UUID taskId, UUID userId, UpdateTaskRequest req) {
        Task t = requireTaskMember(taskId, userId);
        if (req.title() != null && !req.title().isBlank()) t.setTitle(req.title().trim());
        if (req.description() != null) t.setDescription(blankToNull(req.description()));
        if (req.assigneeId() != null) t.setAssigneeId(parseUser(req.assigneeId()));
        if (req.due() != null) t.setDueDate(parseDate(req.due()));
        tasks.save(t);
        return toResponse(t);
    }

    @Transactional
    public TaskResponse moveTask(UUID taskId, UUID userId, MoveTaskRequest req) {
        Task t = requireTaskMember(taskId, userId);
        UUID targetColumn = UUID.fromString(req.columnId());
        // Ensure the target column is in the same workspace the user belongs to.
        requireColumnMember(targetColumn, userId);
        t.setColumnId(targetColumn);
        t.setPosition(req.position());
        tasks.save(t);
        return toResponse(t);
    }

    @Transactional
    public void deleteTask(UUID taskId, UUID userId) {
        requireTaskMember(taskId, userId);
        tasks.deleteById(taskId);
    }

    // --- helpers ------------------------------------------------------------

    private void addColumn(UUID boardId, String name, double position) {
        BoardColumn c = new BoardColumn();
        c.setBoardId(boardId);
        c.setName(name);
        c.setPosition(position);
        columns.save(c);
    }

    private TaskResponse toResponse(Task t) {
        User assignee = t.getAssigneeId() == null ? null
                : users.findById(t.getAssigneeId()).orElse(null);
        return TaskResponse.of(t, assignee);
    }

    private void requireColumnMember(UUID columnId, UUID userId) {
        BoardColumn col = columns.findById(columnId)
                .orElseThrow(() -> ApiException.badRequest("Column not found"));
        Board board = boards.findById(col.getBoardId())
                .orElseThrow(() -> ApiException.badRequest("Board not found"));
        guard.requireMember(board.getWorkspaceId(), userId);
    }

    private Task requireTaskMember(UUID taskId, UUID userId) {
        Task t = tasks.findById(taskId)
                .orElseThrow(() -> ApiException.badRequest("Task not found"));
        requireColumnMember(t.getColumnId(), userId);
        return t;
    }

    private UUID parseUser(String id) {
        if (id == null || id.isBlank()) return null;
        return UUID.fromString(id);
    }

    private LocalDate parseDate(String d) {
        if (d == null || d.isBlank()) return null;
        try {
            return LocalDate.parse(d);
        } catch (Exception e) {
            throw ApiException.badRequest("Invalid date (use YYYY-MM-DD)");
        }
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
