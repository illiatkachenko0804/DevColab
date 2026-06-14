package com.devcollab.chat;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ChannelReadRepository extends JpaRepository<ChannelRead, UUID> {
    Optional<ChannelRead> findByChannelIdAndUserId(UUID channelId, UUID userId);
}
