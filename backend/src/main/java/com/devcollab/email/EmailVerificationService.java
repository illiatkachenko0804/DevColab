package com.devcollab.email;

import java.security.SecureRandom;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.common.error.ApiException;

@Service
public class EmailVerificationService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailVerificationCodeRepository repository;
    private final EmailService emailService;
    private final PasswordEncoder encoder;
    private final long ttlSeconds;
    private final int maxAttempts;

    public EmailVerificationService(
            EmailVerificationCodeRepository repository,
            EmailService emailService,
            PasswordEncoder encoder,
            @Value("${app.verification.ttl-seconds:600}") long ttlSeconds,
            @Value("${app.verification.max-attempts:5}") int maxAttempts) {
        this.repository = repository;
        this.emailService = emailService;
        this.encoder = encoder;
        this.ttlSeconds = ttlSeconds;
        this.maxAttempts = maxAttempts;
    }

    /** Generates a 6-digit code, stores its hash, emails it, and returns it (for dev exposure). */
    @Transactional
    public SentCode createAndSend(String email) {
        // Invalidate any earlier pending codes for this email.
        repository.findTopByEmailIgnoreCaseAndConsumedFalseOrderByCreatedAtDesc(email)
                .ifPresent(c -> {
                    c.setConsumed(true);
                    repository.save(c);
                });

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        EmailVerificationCode entity = new EmailVerificationCode();
        entity.setEmail(email);
        entity.setCodeHash(encoder.encode(code));
        entity.setExpiresAt(Instant.now().plusSeconds(ttlSeconds));
        repository.save(entity);

        boolean delivered = emailService.sendVerificationCode(email, code);
        return new SentCode(code, delivered);
    }

    @Transactional
    public void verify(String email, String code) {
        EmailVerificationCode entity = repository
                .findTopByEmailIgnoreCaseAndConsumedFalseOrderByCreatedAtDesc(email)
                .orElseThrow(() -> ApiException.badRequest("No pending verification. Request a new code."));

        if (entity.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.badRequest("Code expired. Request a new one.");
        }
        if (entity.getAttempts() >= maxAttempts) {
            entity.setConsumed(true);
            repository.save(entity);
            throw ApiException.badRequest("Too many attempts. Request a new code.");
        }
        if (!encoder.matches(code, entity.getCodeHash())) {
            entity.setAttempts(entity.getAttempts() + 1);
            repository.save(entity);
            throw ApiException.badRequest("Incorrect code.");
        }
        entity.setConsumed(true);
        repository.save(entity);
    }

    public record SentCode(String code, boolean delivered) {}
}
