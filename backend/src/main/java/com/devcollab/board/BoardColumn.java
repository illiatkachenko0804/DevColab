package com.devcollab.board;

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
@Table(name = "board_columns")
@Getter
@Setter
@NoArgsConstructor
public class BoardColumn {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "board_id", nullable = false)
    private UUID boardId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private double position;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
