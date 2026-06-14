package com.devcollab.notification.dto;

public record NotificationCounts(
        long total,
        long chat,
        long projects,
        long members,
        long snippets) {}
