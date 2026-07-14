package com.devcollab.activity;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ActivityRepository extends JpaRepository<Activity, UUID> {
    
    @Query("SELECT a FROM Activity a WHERE a.workspaceId = :workspaceId ORDER BY a.createdAt DESC")
    List<Activity> findRecentByWorkspaceId(@Param("workspaceId") UUID workspaceId, Pageable pageable);

}
