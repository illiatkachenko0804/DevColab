package com.devcollab.ws;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import com.devcollab.auth.CookieService;
import com.devcollab.auth.JwtService;

import jakarta.servlet.http.Cookie;

/** Authenticates the WebSocket handshake from the dc_access cookie. */
@Component
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtService jwt;

    public JwtHandshakeInterceptor(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler wsHandler, Map<String, Object> attributes) {
        if (request instanceof ServletServerHttpRequest servlet) {
            Cookie[] cookies = servlet.getServletRequest().getCookies();
            if (cookies != null) {
                for (Cookie c : cookies) {
                    if (CookieService.ACCESS.equals(c.getName())) {
                        UUID userId = jwt.parseAccess(c.getValue());
                        if (userId != null) {
                            attributes.put("userId", userId.toString());
                        }
                    }
                }
            }
        }
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler wsHandler, Exception exception) {
    }
}
