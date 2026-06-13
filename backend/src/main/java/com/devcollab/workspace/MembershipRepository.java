package com.devcollab.workspace;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {
    List<Membership> findByUserIdOrderByJoinedAtAsc(UUID userId);

    List<Membership> findByWorkspaceIdOrderByJoinedAtAsc(UUID workspaceId);

    boolean existsByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
}
