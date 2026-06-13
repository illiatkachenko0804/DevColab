package com.devcollab.workspace.dto;

import jakarta.validation.constraints.NotBlank;

/** A @devtag or an email address. */
public record InviteRequest(@NotBlank String query) {}
