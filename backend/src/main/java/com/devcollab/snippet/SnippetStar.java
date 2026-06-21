package com.devcollab.snippet;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "snippet_stars")
@IdClass(SnippetStarId.class)
@Getter
@Setter
@NoArgsConstructor
public class SnippetStar {

    @Id
    @Column(name = "snippet_id", nullable = false)
    private UUID snippetId;

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
