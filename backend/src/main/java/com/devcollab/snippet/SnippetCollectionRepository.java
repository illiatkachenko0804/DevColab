package com.devcollab.snippet;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SnippetCollectionRepository extends JpaRepository<SnippetCollection, UUID> {
    List<SnippetCollection> findByWorkspaceIdOrderByPositionAsc(UUID workspaceId);
}
