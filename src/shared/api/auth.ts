import { fetchClient } from "./client";

// AuthUser is the principal payload returned by /auth/login and
// /api/v1/auth/me. Mirror of internal/core/auth.User on the backend.
export interface AuthUser {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  name: string;
  email: string;
  is_super: boolean;
  is_tenant_admin: boolean;
  is_active: boolean;
}

export interface LoginResponse {
  token: string;
  expires_at: string;
  user: AuthUser;
  // Present when the server runs in cookie/dual mode. Used by the SPA
  // to echo back as X-CSRF-Token on mutating requests before the
  // archon_csrf cookie roundtrip completes.
  csrf_token?: string;
}

export interface MeResponse {
  user_id: string;
  tenant_id: string;
  tenant_slug: string;
  name: string;
  email: string;
  is_super: boolean;
  is_tenant_admin: boolean;
  permissions: string[];
}

export const login = (email: string, password: string) =>
  fetchClient<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const me = () => fetchClient<MeResponse>("/api/v1/auth/me");

// logout clears the server-side cookies (no-op when the backend runs in
// "off" mode). Failures are swallowed by the caller — the client must
// proceed with local state cleanup regardless.
export const logout = () =>
  fetchClient<{ status: string }>("/auth/logout", { method: "POST" });
