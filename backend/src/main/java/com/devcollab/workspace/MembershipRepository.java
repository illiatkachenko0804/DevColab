package com.devcollab.workspace;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {
    List<Membership> findByUserIdOrderByJoinedAtAsc(UUID userId);

    List<Membership> findByWorkspaceIdOrderByJoinedAtAsc(UUID workspaceId);

    Optional<Membership> findByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);

    boolean existsByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
}
