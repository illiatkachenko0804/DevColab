package com.devcollab.board.dto;

import java.util.List;

public record ColumnResponse(
        String id,
        String name,
        double position,
        List<TaskResponse> tasks) {}
