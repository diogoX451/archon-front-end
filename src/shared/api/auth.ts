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
