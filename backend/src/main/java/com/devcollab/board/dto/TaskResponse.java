package com.devcollab.board.dto;

import com.devcollab.board.Task;
import com.devcollab.user.User;

public record TaskResponse(
        String id,
        String columnId,
        String title,
        String description,
        String due,
        double position,
        Assignee assignee) {

    public record Assignee(String id, String displayName, String devTag, String avatarUrl) {}

    public static TaskResponse of(Task t, User assignee) {
        return new TaskResponse(
                t.getId().toString(),
                t.getColumnId().toString(),
                t.getTitle(),
                t.getDescription(),
                t.getDueDate() == null ? null : t.getDueDate().toString(),
                t.getPosition(),
                assignee == null ? null : new Assignee(
                        assignee.getId().toString(), assignee.getDisplayName(),
                        assignee.getDevTag(), assignee.getAvatarUrl()));
    }
}
