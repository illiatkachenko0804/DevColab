package com.devcollab.activity.dto;

import java.util.UUID;

import com.devcollab.activity.Activity;

public record ActivityResponse(
        String id,
        String actorId,
        String actorName,
        String app,
        String type,
        String text,
        String targetId,
        String createdAt) {

    public static ActivityResponse from(Activity a) {
        return new ActivityResponse(
                a.getId().toString(),
                a.getActorId().toString(),
                a.getActorName(),
                a.getApp(),
                a.getType(),
                a.getText(),
                a.getTargetId(),
                a.getCreatedAt().toString()
        );
    }
}
