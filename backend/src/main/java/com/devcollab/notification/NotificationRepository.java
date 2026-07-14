package com.devcollab.notification;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findTop50ByUserIdAndWorkspaceIdOrderByCreatedAtDesc(UUID userId, UUID workspaceId);

    long countByUserIdAndWorkspaceIdAndReadAtIsNull(UUID userId, UUID workspaceId);

    long countByUserIdAndWorkspaceIdAndAppAndReadAtIsNull(UUID userId, UUID workspaceId, String app);

    @Modifying
    @Query("update Notification n set n.readAt = CURRENT_TIMESTAMP "
            + "where n.userId = :userId and n.workspaceId = :ws and n.readAt is null")
    void markAllRead(@Param("userId") UUID userId, @Param("ws") UUID ws);

    @Modifying
    @Query("update Notification n set n.readAt = CURRENT_TIMESTAMP "
            + "where n.userId = :userId and n.workspaceId = :ws and n.app = :app and n.readAt is null")
    void markReadByApp(@Param("userId") UUID userId, @Param("ws") UUID ws, @Param("app") String app);

    @Modifying
    @Query(value = "UPDATE notifications SET read_at = now() "
            + "WHERE user_id = :userId AND workspace_id = :ws AND read_at IS NULL "
            + "AND payload->>'linkType' = :linkType AND payload->>'linkId' = :linkId",
            nativeQuery = true)
    void markReadByLink(@Param("userId") UUID userId, @Param("ws") UUID ws,
                        @Param("linkType") String linkType, @Param("linkId") String linkId);
}
