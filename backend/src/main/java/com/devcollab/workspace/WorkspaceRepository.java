package com.devcollab.workspace;

import java.util.UUID;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {
    boolean existsBySlug(String slug);

    Optional<Workspace> findBySlug(String slug);
}
