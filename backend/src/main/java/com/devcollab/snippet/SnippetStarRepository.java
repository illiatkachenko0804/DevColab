package com.devcollab.snippet;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SnippetStarRepository extends JpaRepository<SnippetStar, SnippetStarId> {
    List<SnippetStar> findByUserId(UUID userId);
    int countBySnippetId(UUID snippetId);
    boolean existsBySnippetIdAndUserId(UUID snippetId, UUID userId);
}
