package com.devcollab.notification;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.common.error.ApiException;
import com.devcollab.notification.dto.NotificationCounts;
import com.devcollab.notification.dto.NotificationResponse;
import com.devcollab.notification.dto.NotificationsResponse;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.HashSet;
import java.util.Set;

@Service
public class NotificationService {

    private final NotificationRepository repo;
    private final SimpMessagingTemplate broker;
    private final ObjectMapper mapper;
    private final UserRepository users;

    public NotificationService(NotificationRepository repo, SimpMessagingTemplate broker, ObjectMapper mapper, UserRepository users) {
        this.repo = repo;
        this.broker = broker;
        this.mapper = mapper;
        this.users = users;
    }

    /** Creates a notification and pushes it to the recipient over WebSocket. */
    @Transactional
    public void create(UUID userId, UUID workspaceId, String app, String type, Map<String, Object> payload) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setWorkspaceId(workspaceId);
        n.setApp(app);
        n.setType(type);
        try {
            n.setPayload(mapper.writeValueAsString(payload));
        } catch (Exception e) {
            n.setPayload("{}");
        }
        repo.save(n);
        broker.convertAndSendToUser(userId.toString(), "/queue/notifications", toResponse(n));
    }

    private static final Pattern MENTION_PATTERN = Pattern.compile("@([a-zA-Z0-9_]+)");

    @Transactional
    public void notifyMentions(String text, UUID workspaceId, UUID senderId, String senderName, String app, String linkType, String linkId, String titleTemplate) {
        if (text == null || text.isBlank()) return;
        Matcher m = MENTION_PATTERN.matcher(text);
        Set<String> tags = new HashSet<>();
        while (m.find()) {
            tags.add(m.group(1).toLowerCase());
        }
        for (String tag : tags) {
            users.findByDevTag(tag).ifPresent(u -> {
                if (!u.getId().equals(senderId)) {
                    create(u.getId(), workspaceId, app, "mention", Map.of(
                            "title", titleTemplate.replace("{User.displayName}", senderName),
                            "linkType", linkType,
                            "linkId", linkId
                    ));
                }
            });
        }
    }

    @Transactional(readOnly = true)
    public NotificationsResponse list(UUID userId, UUID workspaceId) {
        List<NotificationResponse> items = repo
                .findTop50ByUserIdAndWorkspaceIdOrderByCreatedAtDesc(userId, workspaceId).stream()
                .map(this::toResponse).toList();
        return new NotificationsResponse(items, counts(userId, workspaceId));
    }

    @Transactional(readOnly = true)
    public NotificationCounts counts(UUID userId, UUID workspaceId) {
        return new NotificationCounts(
                repo.countByUserIdAndWorkspaceIdAndReadAtIsNull(userId, workspaceId),
                repo.countByUserIdAndWorkspaceIdAndAppAndReadAtIsNull(userId, workspaceId, "chat"),
                repo.countByUserIdAndWorkspaceIdAndAppAndReadAtIsNull(userId, workspaceId, "projects"),
                repo.countByUserIdAndWorkspaceIdAndAppAndReadAtIsNull(userId, workspaceId, "members"),
                repo.countByUserIdAndWorkspaceIdAndAppAndReadAtIsNull(userId, workspaceId, "snippets"));
    }

    @Transactional
    public void markAllRead(UUID userId, UUID workspaceId) {
        repo.markAllRead(userId, workspaceId);
    }

    @Transactional
    public void markRead(UUID notificationId, UUID userId) {
        Notification n = repo.findById(notificationId)
                .orElseThrow(() -> ApiException.badRequest("Notification not found"));
        if (!n.getUserId().equals(userId)) {
            throw ApiException.unauthorized("Not your notification");
        }
        if (n.getReadAt() == null) {
            n.setReadAt(java.time.Instant.now());
            repo.save(n);
        }
    }

    @Transactional
    public void markReadByApp(UUID userId, UUID workspaceId, String app) {
        repo.markReadByApp(userId, workspaceId, app);
    }

    @Transactional
    public void markReadByLink(UUID userId, UUID workspaceId, String linkType, String linkId) {
        repo.markReadByLink(userId, workspaceId, linkType, linkId);
    }

    private NotificationResponse toResponse(Notification n) {
        String title = "", body = null, channelId = null, linkType = null, linkId = null;
        try {
            JsonNode p = mapper.readTree(n.getPayload());
            title = p.path("title").asText("");
            body = p.hasNonNull("body") ? p.get("body").asText() : null;
            channelId = p.hasNonNull("channelId") ? p.get("channelId").asText() : null;
            linkType = p.hasNonNull("linkType") ? p.get("linkType").asText() : null;
            linkId = p.hasNonNull("linkId") ? p.get("linkId").asText() : null;
        } catch (Exception ignored) {
            // empty payload
        }
        return new NotificationResponse(
                n.getId().toString(), n.getApp(), n.getType(),
                title, body, channelId, n.getCreatedAt().toString(), n.getReadAt() != null,
                linkType, linkId);
    }
}
