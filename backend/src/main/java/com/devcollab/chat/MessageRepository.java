package com.devcollab.chat;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    List<Message> findTop200ByChannelIdOrderByCreatedAtAsc(UUID channelId);
}
