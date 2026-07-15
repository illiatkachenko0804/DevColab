package com.devcollab.auth;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.auth.dto.LoginRequest;
import com.devcollab.auth.dto.RegisterRequest;
import com.devcollab.auth.dto.ResendCodeRequest;
import com.devcollab.auth.dto.UserResponse;
import com.devcollab.auth.dto.VerifyEmailRequest;
import com.devcollab.common.error.ApiException;
import com.devcollab.email.EmailVerificationService.SentCode;
import com.devcollab.user.User;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwt;
    private final CookieService cookies;
    private final TwoFactorService twoFactorService;

    public AuthController(AuthService authService, JwtService jwt, CookieService cookies, TwoFactorService twoFactorService) {
        this.authService = authService;
        this.jwt = jwt;
        this.cookies = cookies;
        this.twoFactorService = twoFactorService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest req) {
        SentCode sent = authService.register(req);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(codeBody(req.email(), sent));
    }

    @PostMapping("/resend-code")
    public ResponseEntity<Map<String, Object>> resend(@Valid @RequestBody ResendCodeRequest req) {
        SentCode sent = authService.resend(req.email());
        return ResponseEntity.accepted().body(codeBody(req.email(), sent));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<UserResponse> verify(@Valid @RequestBody VerifyEmailRequest req) {
        return session(authService.verifyEmail(req.email(), req.code()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        com.devcollab.auth.dto.LoginResult result = authService.login(req);
        if (result.requiresTwoFactor()) {
            return ResponseEntity.accepted()
                    .header(HttpHeaders.SET_COOKIE,
                            cookies.twoFactor(jwt.issueTwoFactorToken(result.user().getId(), result.user().getEmail()), 300).toString())
                    .body(Map.of("requiresTwoFactor", true, "email", result.user().getEmail()));
        }
        return session(result.user());
    }

    /** Issues a fresh access token (and rotates the refresh) from the refresh cookie. */
    @PostMapping("/refresh")
    public ResponseEntity<UserResponse> refresh(
            @CookieValue(name = CookieService.REFRESH, required = false) String refreshToken) {
        if (refreshToken == null) throw ApiException.unauthorized("No session");
        UUID userId = jwt.parseRefresh(refreshToken);
        if (userId == null) throw ApiException.unauthorized("Session expired");
        return session(authService.requireById(userId));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.clear(CookieService.ACCESS).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.clear(CookieService.REFRESH).toString())
                .build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UUID id)) {
            throw ApiException.unauthorized("Not authenticated");
        }
        return ResponseEntity.ok(UserResponse.from(authService.requireById(id)));
    }
    
    @org.springframework.web.bind.annotation.PutMapping("/password")
    public ResponseEntity<Void> setPassword(
            Authentication authentication,
            @Valid @RequestBody com.devcollab.auth.dto.SetPasswordRequest req) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UUID id)) {
            throw ApiException.unauthorized("Not authenticated");
        }
        authService.setPassword(id, req.oldPassword(), req.newPassword());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/2fa/setup")
    public ResponseEntity<Map<String, String>> setupTwoFactor(Authentication authentication) throws dev.samstevens.totp.exceptions.QrGenerationException {
        if (authentication == null || !(authentication.getPrincipal() instanceof UUID id)) {
            throw ApiException.unauthorized("Not authenticated");
        }
        User user = authService.requireById(id);
        String secret = authService.setupTwoFactor(id);
        String qrUri = twoFactorService.generateQrCodeUri(secret, user.getEmail());
        return ResponseEntity.ok(Map.of("secret", secret, "qrCodeUri", qrUri));
    }

    @PostMapping("/2fa/enable")
    public ResponseEntity<Void> enableTwoFactor(
            Authentication authentication,
            @Valid @RequestBody com.devcollab.auth.dto.TwoFactorCodeRequest req) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UUID id)) {
            throw ApiException.unauthorized("Not authenticated");
        }
        authService.enableTwoFactor(id, req.code());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<Void> disableTwoFactor(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UUID id)) {
            throw ApiException.unauthorized("Not authenticated");
        }
        authService.disableTwoFactor(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/2fa/status")
    public ResponseEntity<Map<String, Boolean>> twoFactorStatus(
            @CookieValue(name = CookieService.TWO_FACTOR, required = false) String token) {
        if (token == null) return ResponseEntity.ok(Map.of("requiresTwoFactor", false));
        UUID userId = jwt.parseTwoFactorToken(token);
        return ResponseEntity.ok(Map.of("requiresTwoFactor", userId != null));
    }

    @PostMapping("/2fa/login-verify")
    public ResponseEntity<UserResponse> loginVerifyTwoFactor(
            @CookieValue(name = CookieService.TWO_FACTOR, required = false) String token,
            @Valid @RequestBody com.devcollab.auth.dto.TwoFactorCodeRequest req) {
        if (token == null) throw ApiException.unauthorized("No 2FA session");
        UUID userId = jwt.parseTwoFactorToken(token);
        if (userId == null) throw ApiException.unauthorized("2FA session expired");
        
        User user = authService.requireById(userId);
        if (!user.isTwoFactorEnabled() || user.getTwoFactorSecret() == null) {
            throw ApiException.badRequest("2FA is not enabled for this account");
        }
        if (!twoFactorService.verifyCode(user.getTwoFactorSecret(), req.code())) {
            throw ApiException.unauthorized("Invalid 2FA code");
        }
        
        // Success: clear 2FA cookie and issue standard session
        String access = jwt.issueAccess(user.getId(), user.getEmail());
        String refresh = jwt.issueRefresh(user.getId());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.clear(CookieService.TWO_FACTOR).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.access(access, jwt.accessTtlSeconds()).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.refresh(refresh, jwt.refreshTtlSeconds()).toString())
                .body(UserResponse.from(user));
    }

    // --- helpers ------------------------------------------------------------

    private Map<String, Object> codeBody(String email, SentCode sent) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", "Verification code sent to " + email);
        body.put("emailDelivered", sent.delivered());
        // In dev (no SMTP), surface the code so the flow is testable.
        if (!sent.delivered()) {
            body.put("devCode", sent.code());
        }
        return body;
    }

    private ResponseEntity<UserResponse> session(User user) {
        String access = jwt.issueAccess(user.getId(), user.getEmail());
        String refresh = jwt.issueRefresh(user.getId());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.access(access, jwt.accessTtlSeconds()).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.refresh(refresh, jwt.refreshTtlSeconds()).toString())
                .body(UserResponse.from(user));
    }
}
