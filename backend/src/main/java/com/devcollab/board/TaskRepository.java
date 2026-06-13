package com.devcollab.board;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findByColumnIdOrderByPositionAsc(UUID columnId);
}
