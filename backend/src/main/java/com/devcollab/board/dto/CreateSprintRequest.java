package com.devcollab.board.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateSprintRequest(
    @NotBlank String name,
    String goal,
    String startDate,
    String endDate
) {}
