package com.devcollab.board.dto;

import com.devcollab.board.Label;

public record LabelResponse(String id, String name, String color) {
    public static LabelResponse of(Label l) {
        return new LabelResponse(l.getId().toString(), l.getName(), l.getColor());
    }
}
