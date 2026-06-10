package com.devcollab.auth;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    private final SecretKey key;
    private final long accessTtl;
    private final long refreshTtl;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-ttl-seconds}") long accessTtl,
            @Value("${app.jwt.refresh-token-ttl-seconds}") long refreshTtl) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTtl = accessTtl;
        this.refreshTtl = refreshTtl;
    }

    public long accessTtlSeconds() {
        return accessTtl;
    }

    public long refreshTtlSeconds() {
        return refreshTtl;
    }

    public String issueAccess(UUID userId, String email) {
        return build(userId, "access", accessTtl, builder -> builder.claim("email", email));
    }

    public String issueRefresh(UUID userId) {
        return build(userId, "refresh", refreshTtl, builder -> builder);
    }

    /** Returns the user id if the token is a valid, unexpired access token; otherwise null. */
    public UUID parseAccess(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload();
            if (!"access".equals(claims.get("type", String.class))) return null;
            return UUID.fromString(claims.getSubject());
        } catch (Exception e) {
            return null;
        }
    }

    public UUID parseRefresh(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload();
            if (!"refresh".equals(claims.get("type", String.class))) return null;
            return UUID.fromString(claims.getSubject());
        } catch (Exception e) {
            return null;
        }
    }

    private interface Customizer {
        io.jsonwebtoken.JwtBuilder apply(io.jsonwebtoken.JwtBuilder b);
    }

    private String build(UUID userId, String type, long ttlSeconds, Customizer customizer) {
        Instant now = Instant.now();
        return customizer.apply(Jwts.builder()
                .subject(userId.toString())
                .claim("type", type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ttlSeconds))))
                .signWith(key)
                .compact();
    }
}
