package com.devcollab.board.dto;

import com.devcollab.board.Task;
import com.devcollab.user.User;

import java.util.List;

public record TaskResponse(
        String id,
        String columnId,
        String taskKey,
        String type,
        String priority,
        Integer storyPoints,
        String title,
        String description,
        String due,
        double position,
        String sprintId,
        String parentId,
        Assignee assignee,
        Assignee reporter,
        List<LabelResponse> labels,
        int commentCount,
        int subtaskCount,
        int subtasksDone) {

    public record Assignee(String id, String displayName, String devTag, String avatarUrl) {}

    public static TaskResponse of(
            Task t, User assignee, User reporter,
            List<LabelResponse> labels,
            int commentCount, int subtaskCount, int subtasksDone) {
        return new TaskResponse(
                t.getId().toString(),
                t.getColumnId().toString(),
                t.getTaskKey(),
                t.getType(),
                t.getPriority(),
                t.getStoryPoints(),
                t.getTitle(),
                t.getDescription(),
                t.getDueDate() == null ? null : t.getDueDate().toString(),
                t.getPosition(),
                t.getSprintId() == null ? null : t.getSprintId().toString(),
                t.getParentId() == null ? null : t.getParentId().toString(),
                assignee == null ? null : new Assignee(
                        assignee.getId().toString(), assignee.getDisplayName(),
                        assignee.getDevTag(), assignee.getAvatarUrl()),
                reporter == null ? null : new Assignee(
                        reporter.getId().toString(), reporter.getDisplayName(),
                        reporter.getDevTag(), reporter.getAvatarUrl()),
                labels,
                commentCount,
                subtaskCount,
                subtasksDone);
    }
}
