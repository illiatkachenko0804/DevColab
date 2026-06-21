package com.devcollab.snippet;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SnippetRepository extends JpaRepository<Snippet, UUID> {
    List<Snippet> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);
    long countByWorkspaceIdAndCollectionId(UUID workspaceId, UUID collectionId);
}
