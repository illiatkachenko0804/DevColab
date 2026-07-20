package com.devcollab.file;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FileMemberRepository extends JpaRepository<FileMember, FileMemberId> {
    List<FileMember> findByFileId(UUID fileId);
    void deleteByFileId(UUID fileId);
}
