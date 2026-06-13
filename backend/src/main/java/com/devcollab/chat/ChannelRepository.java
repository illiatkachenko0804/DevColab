package com.devcollab.chat;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ChannelRepository extends JpaRepository<Channel, UUID> {

    List<Channel> findByWorkspaceIdAndTypeOrderByCreatedAtAsc(UUID workspaceId, String type);

    Optional<Channel> findByWorkspaceIdAndName(UUID workspaceId, String name);

    boolean existsByWorkspaceIdAndName(UUID workspaceId, String name);
}
