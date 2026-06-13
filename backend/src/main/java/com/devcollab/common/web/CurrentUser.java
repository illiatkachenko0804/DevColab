package com.devcollab.common.web;

import java.util.UUID;

import org.springframework.security.core.Authentication;

import com.devcollab.common.error.ApiException;

public final class CurrentUser {

    private CurrentUser() {}

    public static UUID id(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UUID id)) {
            throw ApiException.unauthorized("Not authenticated");
        }
        return id;
    }
}
