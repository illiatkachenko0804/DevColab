package com.devcollab.board;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.Set;
import java.util.HashSet;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.devcollab.board.dto.BoardResponse;
import com.devcollab.board.dto.ColumnResponse;
import com.devcollab.board.dto.CreateTaskRequest;
import com.devcollab.board.dto.MoveTaskRequest;
import com.devcollab.board.dto.TaskResponse;
import com.devcollab.board.dto.UpdateTaskRequest;
import com.devcollab.board.dto.LabelResponse;
import com.devcollab.common.error.ApiException;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.WorkspaceGuard;
import com.devcollab.workspace.Workspace;
import com.devcollab.workspace.WorkspaceRepository;

@Service
public class BoardService {

    private final BoardRepository boards;
    private final BoardColumnRepository columns;
    private final TaskRepository tasks;
    private final UserRepository users;
    private final WorkspaceGuard guard;
    private final TaskCommentRepository comments;
    private final LabelRepository labels;
    private final WorkspaceRepository workspaces;
    private final SimpMessagingTemplate broker;

    public BoardService(
            BoardRepository boards, BoardColumnRepository columns, TaskRepository tasks,
            UserRepository users, WorkspaceGuard guard, TaskCommentRepository comments,
            LabelRepository labels, WorkspaceRepository workspaces, SimpMessagingTemplate broker) {
        this.boards = boards;
        this.columns = columns;
        this.tasks = tasks;
        this.users = users;
        this.guard = guard;
        this.comments = comments;
        this.labels = labels;
        this.workspaces = workspaces;
        this.broker = broker;
    }

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
        BoardColumn col = columns.findById(columnId).orElseThrow();
        Board board = boards.findById(col.getBoardId()).orElseThrow();
        guard.requireMember(board.getWorkspaceId(), userId);
        Workspace ws = workspaces.findById(board.getWorkspaceId()).orElseThrow();

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

        t.setTaskKey(ws.getSlug().toUpperCase() + "-" + tasks.getNextTaskKeySeq());
        if (req.type() != null) t.setType(req.type());
        if (req.priority() != null) t.setPriority(req.priority());
        t.setStoryPoints(req.storyPoints());
        t.setSprintId(parseUser(req.sprintId()));
        t.setParentId(parseUser(req.parentId()));
        if (t.getParentId() != null) {
            Task parent = tasks.findById(t.getParentId()).orElse(null);
            if (parent != null) {
                t.setSprintId(parent.getSprintId());
            }
        }
        t.setReporterId(userId);

        if (req.labelIds() != null) {
            Set<Label> taskLabels = new HashSet<>();
            for (String lid : req.labelIds()) {
                labels.findById(parseUser(lid)).ifPresent(taskLabels::add);
            }
            t.setLabels(taskLabels);
        }

        tasks.save(t);
        broadcastBoardUpdate(board.getWorkspaceId());
        return toResponse(t);
    }

    @Transactional
    public TaskResponse updateTask(UUID taskId, UUID userId, UpdateTaskRequest req) {
        Task t = requireTaskMember(taskId, userId);
        if (req.title() != null && !req.title().isBlank()) t.setTitle(req.title().trim());
        if (req.description() != null) t.setDescription(blankToNull(req.description()));
        if (req.assigneeId() != null) t.setAssigneeId(parseUser(req.assigneeId()));
        if (req.due() != null) t.setDueDate(parseDate(req.due()));

        if (req.type() != null) t.setType(req.type());
        if (req.priority() != null) t.setPriority(req.priority());
        if (req.storyPoints() != null) t.setStoryPoints(req.storyPoints());
        if (req.sprintId() != null) t.setSprintId(parseUser(req.sprintId()));
        if (req.parentId() != null) t.setParentId(parseUser(req.parentId()));

        if (req.labelIds() != null) {
            Set<Label> taskLabels = new HashSet<>();
            for (String lid : req.labelIds()) {
                labels.findById(parseUser(lid)).ifPresent(taskLabels::add);
            }
            t.setLabels(taskLabels);
        }

        tasks.save(t);
        BoardColumn col = columns.findById(t.getColumnId()).orElseThrow();
        Board board = boards.findById(col.getBoardId()).orElseThrow();
        broadcastBoardUpdate(board.getWorkspaceId());
        return toResponse(t);
    }

    @Transactional
    public TaskResponse moveTask(UUID taskId, UUID userId, MoveTaskRequest req) {
        Task t = requireTaskMember(taskId, userId);
        UUID targetColumnId = UUID.fromString(req.columnId());
        requireColumnMember(targetColumnId, userId);
        
        BoardColumn targetColumn = columns.findById(targetColumnId).orElseThrow();
        BoardColumn currentColumn = columns.findById(t.getColumnId()).orElseThrow();



        t.setColumnId(targetColumnId);
        t.setPosition(req.position());
        tasks.save(t);

        Board board = boards.findById(targetColumn.getBoardId()).orElseThrow();
        broadcastBoardUpdate(board.getWorkspaceId());
        return toResponse(t);
    }

    @Transactional
    public void deleteTask(UUID taskId, UUID userId) {
        Task t = requireTaskMember(taskId, userId);
        tasks.deleteById(taskId);
        BoardColumn col = columns.findById(t.getColumnId()).orElseThrow();
        Board board = boards.findById(col.getBoardId()).orElseThrow();
        broadcastBoardUpdate(board.getWorkspaceId());
    }

    private void addColumn(UUID boardId, String name, double position) {
        BoardColumn c = new BoardColumn();
        c.setBoardId(boardId);
        c.setName(name);
        c.setPosition(position);
        columns.save(c);
    }

    private TaskResponse toResponse(Task t) {
        User assignee = t.getAssigneeId() == null ? null : users.findById(t.getAssigneeId()).orElse(null);
        User reporter = t.getReporterId() == null ? null : users.findById(t.getReporterId()).orElse(null);

        List<LabelResponse> labelRes = t.getLabels().stream().map(LabelResponse::of).toList();
        int commentCount = comments.findByTaskIdOrderByCreatedAtAsc(t.getId()).size();
        
        List<Task> subtasks = tasks.findByParentId(t.getId());
        int subtaskCount = subtasks.size();
        
        // Count subtasks that are in the "Done" column or right-most column.
        // For simplicity, we just count tasks that are in a column named "Done".
        int subtasksDone = (int) subtasks.stream().filter(sub -> {
            return columns.findById(sub.getColumnId())
                    .map(c -> c.getName().equalsIgnoreCase("Done"))
                    .orElse(false);
        }).count();

        return TaskResponse.of(t, assignee, reporter, labelRes, commentCount, subtaskCount, subtasksDone);
    }

    private void requireColumnMember(UUID columnId, UUID userId) {
        BoardColumn col = columns.findById(columnId).orElseThrow(() -> ApiException.badRequest("Column not found"));
        Board board = boards.findById(col.getBoardId()).orElseThrow(() -> ApiException.badRequest("Board not found"));
        guard.requireMember(board.getWorkspaceId(), userId);
    }

    private Task requireTaskMember(UUID taskId, UUID userId) {
        Task t = tasks.findById(taskId).orElseThrow(() -> ApiException.badRequest("Task not found"));
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

    private void broadcastBoardUpdate(UUID workspaceId) {
        broker.convertAndSend("/topic/workspace." + workspaceId + ".board", "{\"type\":\"BOARD_UPDATE\"}");
    }
}
