package com.devcollab.snippet;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SnippetTagRepository extends JpaRepository<SnippetTag, UUID> {
    List<SnippetTag> findByWorkspaceIdOrderByNameAsc(UUID workspaceId);
    Optional<SnippetTag> findByWorkspaceIdAndName(UUID workspaceId, String name);
}
