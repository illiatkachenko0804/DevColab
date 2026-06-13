package com.devcollab.ws;

import java.security.Principal;

/** Carries the authenticated user id (as name) for STOMP sessions. */
public record StompPrincipal(String name) implements Principal {
    @Override
    public String getName() {
        return name;
    }
}
