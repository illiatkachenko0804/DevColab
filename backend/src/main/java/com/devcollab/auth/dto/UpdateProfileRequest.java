package com.devcollab.auth.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 100, message = "Name is too long") String displayName,
        @Size(max = 31, message = "DevTag is too long") String devTag) {}
