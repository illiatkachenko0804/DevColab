package com.devcollab.user;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByGithubId(String githubId);

    Optional<User> findByDevTag(String devTag);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByDevTag(String devTag);

    boolean existsByDevTagAndIdNot(String devTag, java.util.UUID id);
}
