package com.devcollab.board;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SprintRepository extends JpaRepository<Sprint, UUID> {
    List<Sprint> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);
}
