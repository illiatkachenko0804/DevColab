package com.devcollab.workspace;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkspaceInvitationRepository extends JpaRepository<WorkspaceInvitation, UUID> {
    List<WorkspaceInvitation> findByEmailIgnoreCase(String email);
    boolean existsByWorkspaceIdAndEmailIgnoreCase(UUID workspaceId, String email);
    void deleteByEmailIgnoreCase(String email);
}
