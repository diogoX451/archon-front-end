import { fetchClient } from "./client";

// AuthUser is the principal payload returned by /auth/login and /api/v1/auth/me.
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

export interface SignupPayload {
  tenant_name: string;
  tenant_slug: string;
  document?: string;
  // Public signup always provisions a free tenant; the backend ignores tier.
  // Kept optional only for backward compatibility — do not surface a picker.
  tier?: "free" | "starter" | "growth" | "enterprise";
  name: string;
  email: string;
  password: string;
}

export interface SignupResponse {
  status: string;
  tenant: { id: string; slug: string; name: string; plan?: string; tier?: string };
  user: { id: string; email: string; name: string };
  bootstrap?: { api_key?: string; api_key_prefix?: string; webhook_url?: string };
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

export const signup = (payload: SignupPayload) =>
  fetchClient<SignupResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const verifyEmail = (token: string) =>
  fetchClient<{ status: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`);

export const resendVerification = (email: string) =>
  fetchClient<{ status: string }>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const forgotPassword = (email: string) =>
  fetchClient<{ status: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const resetPassword = (token: string, newPassword: string) =>
  fetchClient<{ status: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
