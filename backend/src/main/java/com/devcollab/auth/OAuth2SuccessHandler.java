package com.devcollab.auth;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.devcollab.user.User;
import com.devcollab.user.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * After a successful GitHub login, upsert the user, set the auth cookies, and
 * redirect back to the frontend.
 */
@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository users;
    private final JwtService jwt;
    private final CookieService cookies;
    private final AuthService authService;
    private final String frontendUrl;

    public OAuth2SuccessHandler(
            UserRepository users,
            JwtService jwt,
            CookieService cookies,
            AuthService authService,
            @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl) {
        this.users = users;
        this.jwt = jwt;
        this.cookies = cookies;
        this.authService = authService;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException {

        OAuth2User principal = (OAuth2User) authentication.getPrincipal();
        Object idObj = principal.getAttribute("id");
        String githubId = idObj != null ? String.valueOf(idObj) : null;
        String login = principal.getAttribute("login");
        String name = principal.getAttribute("name");
        String avatar = principal.getAttribute("avatar_url");
        String email = principal.getAttribute("email");
        if (email == null || email.isBlank()) {
            email = login + "@users.noreply.github.com";
        }

        final String resolvedEmail = email.toLowerCase();
        User user = users.findByGithubId(githubId)
                .or(() -> users.findByEmailIgnoreCase(resolvedEmail))
                .orElseGet(User::new);
        user.setGithubId(githubId);
        user.setEmail(resolvedEmail);
        if (user.getDisplayName() == null) {
            user.setDisplayName(name != null ? name : login);
        }
        if (user.getDevTag() == null) {
            user.setDevTag(authService.uniqueDevTag(login != null ? login : resolvedEmail));
        }
        user.setAvatarUrl(avatar);
        user.setEmailVerified(true); // GitHub identities are pre-verified
        user = users.save(user);

        if (user.isTwoFactorEnabled()) {
            // Issue a temporary 2FA token instead of access/refresh tokens
            response.addHeader(HttpHeaders.SET_COOKIE,
                    cookies.twoFactor(jwt.issueTwoFactorToken(user.getId(), user.getEmail()), 300).toString());
        } else {
            response.addHeader(HttpHeaders.SET_COOKIE,
                    cookies.access(jwt.issueAccess(user.getId(), user.getEmail()), jwt.accessTtlSeconds()).toString());
            response.addHeader(HttpHeaders.SET_COOKIE,
                    cookies.refresh(jwt.issueRefresh(user.getId()), jwt.refreshTtlSeconds()).toString());
        }

        response.sendRedirect(frontendUrl);
    }
}
