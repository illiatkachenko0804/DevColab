package com.devcollab.auth.dto;

import com.devcollab.user.User;

public record LoginResult(User user, boolean requiresTwoFactor) {}
