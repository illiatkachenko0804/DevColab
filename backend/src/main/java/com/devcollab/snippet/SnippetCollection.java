package com.devcollab.snippet;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "snippet_collections")
@Getter
@Setter
@NoArgsConstructor
public class SnippetCollection {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String color = "#8e8e93";

    @Column
    private String icon = "folder";

    @Column(nullable = false)
    private Double position = 1000.0;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
