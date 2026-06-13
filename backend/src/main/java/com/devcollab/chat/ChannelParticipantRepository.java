package com.devcollab.chat;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ChannelParticipantRepository extends JpaRepository<ChannelParticipant, UUID> {

    List<ChannelParticipant> findByUserId(UUID userId);

    List<ChannelParticipant> findByChannelId(UUID channelId);

    boolean existsByChannelIdAndUserId(UUID channelId, UUID userId);
}
