import { clearAuth, getCsrfToken, getToken } from "./token";

function normalizeApiBaseUrl(value?: string): string {
  if (!value) return "";
  if (value === "/") return "";
  return value.replace(/\/+$/, "");
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_ARCHON_API_URL || import.meta.env.VITE_API_URL);

// Auth transport. "cookie" tells the client to rely on the httpOnly
// session cookie set by /auth/login and echo the CSRF token in the
// X-CSRF-Token header for mutating verbs. "bearer" (default) keeps the
// pre-Phase-B behaviour (Authorization: Bearer <token>).
//
// Set VITE_ARCHON_AUTH_MODE=cookie in the prod build. Both ends must
// match the backend's ARCHON_AUTH_COOKIE_MODE: cookie pairs with
// dual/cookie-only; bearer pairs with off/dual.
export const AUTH_MODE: "bearer" | "cookie" =
  import.meta.env.VITE_ARCHON_AUTH_MODE === "cookie" ? "cookie" : "bearer";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_COOKIE = "archon_csrf";

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const prefix = name + "=";
  const parts = document.cookie ? document.cookie.split("; ") : [];
  for (const part of parts) {
    if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length));
  }
  return "";
}

export function withApiBase(endpoint: string): string {
  if (!endpoint.startsWith("/")) {
    return API_BASE_URL ? `${API_BASE_URL}/${endpoint}` : `/${endpoint}`;
  }
  return `${API_BASE_URL}${endpoint}`;
}

export class ApiError extends Error {
  constructor(public status: number, public message: string, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

// Fired when fetchClient receives a 401 — listeners can clear in-memory
// react-query state and redirect to /login. The auth context wires its
// listener at boot.
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  onUnauthorized = fn;
}

export async function fetchClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = withApiBase(endpoint);

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Always attach CSRF on mutations when the cookie is present.
  // The backend enforces CSRF whenever it sees a session cookie,
  // regardless of whether the client also sends a Bearer token.
  const method = (options.method || "GET").toUpperCase();
  if (MUTATING_METHODS.has(method) && !headers.has("X-CSRF-Token")) {
    const csrf = readCookie(CSRF_COOKIE) || getCsrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  if (AUTH_MODE !== "cookie") {
    const token = getToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    // Always send cookies — even in bearer mode the cost is negligible
    // and lets the same client run against a cookie-mode backend.
    credentials: "include",
  });

  if (response.status === 401) {
    clearAuth();
    if (onUnauthorized) onUnauthorized();
  }

  if (!response.ok) {
    let errorData: { error?: string; code?: string };
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: response.statusText };
    }
    throw new ApiError(response.status, errorData.error || "An error occurred", errorData.code);
  }

  if (response.status === 204) {
    return {} as T;
  }
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text() as unknown as T;
}
