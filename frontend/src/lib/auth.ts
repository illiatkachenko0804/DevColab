import { ApiError, api } from "./api";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  devTag: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
}

export interface RegisterResult {
  message: string;
  emailDelivered: boolean;
  devCode?: string;
}

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function register(body: {
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
}): Promise<RegisterResult> {
  return api("/api/auth/register", { method: "POST", body: JSON.stringify(body) });
}

export function resendCode(email: string): Promise<RegisterResult> {
  return api("/api/auth/resend-code", { method: "POST", body: JSON.stringify({ email }) });
}

export function verifyEmail(email: string, code: string): Promise<AuthUser> {
  return api("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ email, code }) });
}

export function login(email: string, password: string): Promise<AuthUser> {
  return api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function logout(): Promise<void> {
  return api("/api/auth/logout", { method: "POST" });
}

export function updateProfile(body: {
  displayName?: string;
  devTag?: string;
  avatarUrl?: string | null;
}): Promise<AuthUser> {
  return api("/api/profile", { method: "PATCH", body: JSON.stringify(body) });
}

export function setPassword(oldPassword?: string, newPassword?: string): Promise<void> {
  return api("/api/auth/password", { method: "PUT", body: JSON.stringify({ oldPassword, newPassword }) });
}

export function fetchMe(): Promise<AuthUser> {
  return api("/api/auth/me");
}

export const githubAuthUrl = `${BASE}/oauth2/authorization/github`;

/** Pulls a human-readable message (and any field details) out of an ApiError. */
export function authErrorMessage(err: unknown): { message: string; details: string[] } {
  if (err instanceof ApiError) {
    const body = err.detail as { detail?: string; details?: string[] } | undefined;
    return {
      message: body?.detail ?? err.message,
      details: body?.details ?? [],
    };
  }
  return { message: "Something went wrong. Is the API running?", details: [] };
}
