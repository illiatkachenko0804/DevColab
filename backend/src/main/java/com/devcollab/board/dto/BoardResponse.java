package com.devcollab.board.dto;

import java.util.List;

public record BoardResponse(
        String id,
        String name,
        List<ColumnResponse> columns) {}
