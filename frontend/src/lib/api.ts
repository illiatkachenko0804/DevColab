/**
 * Thin fetch wrapper around the Spring API.
 * - Sends the httpOnly auth cookie via `credentials: "include"`.
 * - Throws {@link ApiError} on non-2xx so React Query can surface it.
 */
const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Access token expired? Try a one-shot refresh, then replay the request.
  if (res.status === 401 && retry && path !== "/api/auth/refresh") {
    const refreshed = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refreshed.ok) return api<T>(path, options, false);
  }

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      /* no JSON body */
    }
    throw new ApiError(res.status, `Request failed with ${res.status}`, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
