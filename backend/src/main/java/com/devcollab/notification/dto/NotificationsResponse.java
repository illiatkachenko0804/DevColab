package com.devcollab.notification.dto;

import java.util.List;

public record NotificationsResponse(
        List<NotificationResponse> items,
        NotificationCounts counts) {}
