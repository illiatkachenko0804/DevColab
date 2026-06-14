package com.devcollab.notification.dto;

public record NotificationResponse(
        String id,
        String app,
        String type,
        String title,
        String body,
        String channelId,
        String createdAt,
        boolean read) {}
