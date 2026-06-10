package com.devcollab.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @Email(message = "Enter a valid email") @NotBlank String email,
        @NotBlank @Size(max = 100, message = "Name is too long") String displayName,
        @NotBlank String password,
        @NotBlank String confirmPassword) {}
