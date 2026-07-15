package com.devcollab.auth;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.devcollab.auth.dto.LoginRequest;
import com.devcollab.auth.dto.RegisterRequest;
import com.devcollab.common.error.ApiException;
import com.devcollab.email.EmailVerificationService;
import com.devcollab.email.EmailVerificationService.SentCode;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.MembershipRepository;
import com.devcollab.workspace.Membership;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository users;
    private final EmailVerificationService verification;
    private final PasswordEncoder encoder;
    private final MembershipRepository memberships;
    private final SimpMessagingTemplate broker;

    public AuthService(UserRepository users, EmailVerificationService verification, PasswordEncoder encoder,
                       MembershipRepository memberships, SimpMessagingTemplate broker) {
        this.users = users;
        this.verification = verification;
        this.encoder = encoder;
        this.memberships = memberships;
        this.broker = broker;
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
        if (user.getDevTag() == null) {
            user.setDevTag(uniqueDevTag(email));
        }
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

    public com.devcollab.auth.dto.LoginResult login(LoginRequest req) {
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
        return new com.devcollab.auth.dto.LoginResult(user, user.isTwoFactorEnabled());
    }

    public User requireById(UUID id) {
        return users.findById(id).orElseThrow(() -> ApiException.unauthorized("Not authenticated"));
    }

    @Transactional
    public User updateProfile(UUID userId, String displayName, String devTag, String avatarUrl) {
        User user = requireById(userId);
        if (displayName != null && !displayName.isBlank()) {
            user.setDisplayName(displayName.trim());
        }
        if (devTag != null && !devTag.isBlank()) {
            String normalized = devTag.trim().toLowerCase().replaceFirst("^@", "");
            if (!normalized.matches("[a-z0-9_]{3,30}")) {
                throw ApiException.badRequest(
                        "DevTag must be 3–30 characters: lowercase letters, numbers or underscore");
            }
            if (users.existsByDevTagAndIdNot(normalized, userId)) {
                throw ApiException.conflict("That @" + normalized + " is already taken");
            }
            user.setDevTag(normalized);
        }
        if (avatarUrl != null) {
            user.setAvatarUrl(avatarUrl.isBlank() ? null : avatarUrl.trim());
        }
        User saved = users.save(user);

        // Broadcast MEMBER_UPDATED to all workspaces this user belongs to
        for (Membership m : memberships.findByUserIdOrderByJoinedAtAsc(userId)) {
            broker.convertAndSend("/topic/workspace." + m.getWorkspaceId() + ".members",
                    Map.of("type", "MEMBER_UPDATED", "userId", userId.toString()));
        }

        return saved;
    }

    @Transactional
    public void setPassword(UUID userId, String oldPassword, String newPassword) {
        User user = users.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
                
        if (user.getPasswordHash() != null) {
            if (oldPassword == null || oldPassword.isBlank()) {
                throw ApiException.badRequest("Current password is required");
            }
            if (!encoder.matches(oldPassword, user.getPasswordHash())) {
                throw ApiException.badRequest("Incorrect current password");
            }
        }
        
        PasswordPolicy.Result result = PasswordPolicy.evaluate(newPassword);
        if (!result.valid()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Password does not meet the requirements", result.violations());
        }
        
        user.setPasswordHash(encoder.encode(newPassword));
        users.save(user);
    }

    @Transactional
    public String setupTwoFactor(UUID userId) {
        User user = requireById(userId);
        if (user.isTwoFactorEnabled()) {
            throw ApiException.badRequest("2FA is already enabled");
        }
        // Generate a new secret but don't enable yet. We save it so it can be verified.
        // It's possible to just keep it in memory/session, but saving it temporarily is easier.
        // Actually, if we don't save it, we'd have to return it to the client and trust the client to send it back.
        // Better to save it. But if they never verify, it sits there. That's fine, twoFactorEnabled = false.
        String secret = new TwoFactorService().generateSecret();
        user.setTwoFactorSecret(secret);
        users.save(user);
        return secret;
    }

    @Transactional
    public void enableTwoFactor(UUID userId, String code) {
        User user = requireById(userId);
        if (user.isTwoFactorEnabled()) {
            throw ApiException.badRequest("2FA is already enabled");
        }
        if (user.getTwoFactorSecret() == null) {
            throw ApiException.badRequest("2FA setup not initiated");
        }
        if (!new TwoFactorService().verifyCode(user.getTwoFactorSecret(), code)) {
            throw ApiException.badRequest("Invalid 2FA code");
        }
        user.setTwoFactorEnabled(true);
        users.save(user);
    }

    @Transactional
    public void disableTwoFactor(UUID userId) {
        User user = requireById(userId);
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        users.save(user);
    }

    /** Builds a unique @handle from an email or seed string. */
    public String uniqueDevTag(String seed) {
        String base = seed.contains("@") ? seed.substring(0, seed.indexOf('@')) : seed;
        base = base.toLowerCase().replaceAll("[^a-z0-9_]", "");
        if (base.length() < 3) base = "dev" + base;
        if (base.length() > 24) base = base.substring(0, 24);
        String tag = base;
        int n = 0;
        while (users.existsByDevTag(tag)) {
            n++;
            tag = base + n;
            if (n > 9999) {
                tag = base + UUID.randomUUID().toString().substring(0, 6);
                break;
            }
        }
        return tag;
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase();
    }
}
