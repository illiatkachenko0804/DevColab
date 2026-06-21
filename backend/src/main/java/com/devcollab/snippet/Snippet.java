package com.devcollab.snippet;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.JoinTable;
import jakarta.persistence.JoinColumn;
import java.util.Set;
import java.util.HashSet;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "snippets")
@Getter
@Setter
@NoArgsConstructor
public class Snippet {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String language = "plaintext";

    @Column(nullable = false)
    private String code;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "collection_id")
    private UUID collectionId;

    @Column
    private String description;

    @Column(name = "forked_from")
    private UUID forkedFrom;

    @Column(nullable = false)
    private Boolean pinned = false;

    @Column(nullable = false)
    private String visibility = "WORKSPACE";

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ManyToMany
    @JoinTable(
        name = "snippet_tag_map",
        joinColumns = @JoinColumn(name = "snippet_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<SnippetTag> tags = new HashSet<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
