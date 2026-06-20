package com.devcollab.board.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateLabelRequest(
    @NotBlank String name,
    @NotBlank String color
) {}
