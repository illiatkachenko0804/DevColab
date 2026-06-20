package com.devcollab.board.dto;

public record UpdateSprintRequest(
    String name,
    String goal,
    String startDate,
    String endDate,
    String status
) {}
