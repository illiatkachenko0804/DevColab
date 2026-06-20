package com.devcollab.board.dto;

import com.devcollab.board.Sprint;

public record SprintResponse(
    String id,
    String name,
    String goal,
    String status,
    String startDate,
    String endDate,
    int taskCount,
    int completedCount,
    int totalPoints,
    int completedPoints
) {
    public static SprintResponse of(Sprint s, int taskCount, int completedCount, int totalPoints, int completedPoints) {
        return new SprintResponse(
            s.getId().toString(),
            s.getName(),
            s.getGoal(),
            s.getStatus(),
            s.getStartDate() == null ? null : s.getStartDate().toString(),
            s.getEndDate() == null ? null : s.getEndDate().toString(),
            taskCount,
            completedCount,
            totalPoints,
            completedPoints
        );
    }
}
