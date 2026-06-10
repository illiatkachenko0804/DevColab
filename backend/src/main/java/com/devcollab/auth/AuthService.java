package com.devcollab.auth;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.auth.dto.LoginRequest;
import com.devcollab.auth.dto.RegisterRequest;
import com.devcollab.common.error.ApiException;
import com.devcollab.email.EmailVerificationService;
import com.devcollab.email.EmailVerificationService.SentCode;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;

@Service
public class AuthService {

    private final UserRepository users;
    private final EmailVerificationService verification;
    private final PasswordEncoder encoder;

    public AuthService(UserRepository users, EmailVerificationService verification, PasswordEncoder encoder) {
        this.users = users;
        this.verification = verification;
        this.encoder = encoder;
    }

    @Transactional
    public SentCode register(RegisterRequest req) {
        if (!req.password().equals(req.confirmPassword())) {
            throw ApiException.badRequest("Passwords do not match");
        }
        PasswordPolicy.Result result = PasswordPolicy.evaluate(req.password());
        if (!result.valid()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Password does not meet the requirements", result.violations());
        }

        String email = normalize(req.email());
        User existing = users.findByEmailIgnoreCase(email).orElse(null);
        if (existing != null && existing.isEmailVerified()) {
            throw ApiException.conflict("An account with this email already exists");
        }

        // Reuse an unverified record (lets people retry) or create a new one.
        User user = existing != null ? existing : new User();
        user.setEmail(email);
        user.setDisplayName(req.displayName().trim());
        user.setPasswordHash(encoder.encode(req.password()));
        user.setEmailVerified(false);
        users.save(user);

        return verification.createAndSend(email);
    }

    @Transactional
    public User verifyEmail(String email, String code) {
        String normalized = normalize(email);
        verification.verify(normalized, code);
        User user = users.findByEmailIgnoreCase(normalized)
                .orElseThrow(() -> ApiException.badRequest("Account not found"));
        user.setEmailVerified(true);
        return users.save(user);
    }

    public SentCode resend(String email) {
        String normalized = normalize(email);
        User user = users.findByEmailIgnoreCase(normalized)
                .orElseThrow(() -> ApiException.badRequest("No account is pending verification for this email"));
        if (user.isEmailVerified()) {
            throw ApiException.badRequest("This email is already verified");
        }
        return verification.createAndSend(normalized);
    }

    public User login(LoginRequest req) {
        User user = users.findByEmailIgnoreCase(normalize(req.email()))
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
        if (user.getPasswordHash() == null) {
            throw ApiException.unauthorized("This account uses GitHub sign-in");
        }
        if (!encoder.matches(req.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid email or password");
        }
        if (!user.isEmailVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Please verify your email first");
        }
        return user;
    }

    public User requireById(UUID id) {
        return users.findById(id).orElseThrow(() -> ApiException.unauthorized("Not authenticated"));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase();
    }
}
