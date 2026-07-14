package com.devcollab.workspace;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceRoleRepository extends JpaRepository<WorkspaceRole, UUID> {
    List<WorkspaceRole> findByWorkspaceIdOrderByCreatedAtAsc(UUID workspaceId);

    boolean existsByWorkspaceIdAndNameIgnoreCase(UUID workspaceId, String name);

    boolean existsByWorkspaceIdAndNameIgnoreCaseAndIdNot(UUID workspaceId, String name, UUID id);

    Optional<WorkspaceRole> findByWorkspaceIdAndSystemKey(UUID workspaceId, String systemKey);
}
