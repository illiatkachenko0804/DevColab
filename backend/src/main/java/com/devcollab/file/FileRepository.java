package com.devcollab.file;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FileRepository extends JpaRepository<StoredFile, UUID> {
    List<StoredFile> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);
}
