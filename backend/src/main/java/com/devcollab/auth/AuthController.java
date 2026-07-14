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

    public AuthController(AuthService authService, JwtService jwt, CookieService cookies) {
        this.authService = authService;
        this.jwt = jwt;
        this.cookies = cookies;
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
    public ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest req) {
        return session(authService.login(req));
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
