package com.devcollab.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

/**
 * Builds the httpOnly auth cookies. Defaults (SameSite=Lax, secure=false) work
 * for local dev where the frontend (:3000) and API (:8080) are the same site.
 * For cross-site production set {@code app.cookie.same-site=None} and
 * {@code app.cookie.secure=true} (requires HTTPS).
 */
@Service
public class CookieService {

    public static final String ACCESS = "dc_access";
    public static final String REFRESH = "dc_refresh";
    public static final String TWO_FACTOR = "dc_2fa";

    private final boolean secure;
    private final String sameSite;

    public CookieService(
            @Value("${app.cookie.secure:false}") boolean secure,
            @Value("${app.cookie.same-site:Lax}") String sameSite) {
        this.secure = secure;
        this.sameSite = sameSite;
    }

    public ResponseCookie access(String token, long maxAgeSeconds) {
        return base(ACCESS, token, maxAgeSeconds).build();
    }

    public ResponseCookie refresh(String token, long maxAgeSeconds) {
        return base(REFRESH, token, maxAgeSeconds).path("/api/auth").build();
    }

    public ResponseCookie twoFactor(String token, long maxAgeSeconds) {
        return base(TWO_FACTOR, token, maxAgeSeconds).path("/api/auth").build();
    }

    public ResponseCookie clear(String name) {
        String path = (name.equals(REFRESH) || name.equals(TWO_FACTOR)) ? "/api/auth" : "/";
        return ResponseCookie.from(name, "")
                .httpOnly(true).secure(secure).sameSite(sameSite)
                .path(path).maxAge(0).build();
    }

    private ResponseCookie.ResponseCookieBuilder base(String name, String value, long maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/")
                .maxAge(maxAge);
    }
}
