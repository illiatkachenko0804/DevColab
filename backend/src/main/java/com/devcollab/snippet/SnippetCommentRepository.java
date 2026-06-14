package com.devcollab.snippet;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SnippetCommentRepository extends JpaRepository<SnippetComment, UUID> {
    List<SnippetComment> findBySnippetIdOrderByCreatedAtAsc(UUID snippetId);

    long countBySnippetId(UUID snippetId);
}
