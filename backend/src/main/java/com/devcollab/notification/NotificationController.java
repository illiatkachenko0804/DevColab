package com.devcollab.notification;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.common.web.CurrentUser;
import com.devcollab.notification.dto.NotificationsResponse;

@RestController
public class NotificationController {

    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) {
        this.notifications = notifications;
    }

    @GetMapping("/api/workspaces/{workspaceId}/notifications")
    public NotificationsResponse list(@PathVariable UUID workspaceId, Authentication auth) {
        return notifications.list(CurrentUser.id(auth), workspaceId);
    }

    @PostMapping("/api/workspaces/{workspaceId}/notifications/read-all")
    public ResponseEntity<Void> readAll(@PathVariable UUID workspaceId, Authentication auth) {
        notifications.markAllRead(CurrentUser.id(auth), workspaceId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/notifications/{notificationId}/read")
    public ResponseEntity<Void> read(@PathVariable UUID notificationId, Authentication auth) {
        notifications.markRead(notificationId, CurrentUser.id(auth));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/workspaces/{workspaceId}/notifications/read-by-app")
    public ResponseEntity<Void> readByApp(@PathVariable UUID workspaceId,
                                           @RequestParam String app, Authentication auth) {
        notifications.markReadByApp(CurrentUser.id(auth), workspaceId, app);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/workspaces/{workspaceId}/notifications/read-by-link")
    public ResponseEntity<Void> readByLink(@PathVariable UUID workspaceId,
                                            @RequestParam String linkType,
                                            @RequestParam String linkId,
                                            Authentication auth) {
        notifications.markReadByLink(CurrentUser.id(auth), workspaceId, linkType, linkId);
        return ResponseEntity.noContent().build();
    }
}
