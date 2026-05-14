import { fetchClient } from "./client";
import type { Role } from "./roles";

export interface User {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  name: string;
  email: string;
  is_super: boolean;
  is_tenant_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  tenant_slug: string;
  name: string;
  email: string;
  password: string;
  is_tenant_admin?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  is_tenant_admin?: boolean;
}

export interface UpdateUserStatusInput {
  is_active: boolean;
}

export const listUsers = (tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<User[]>(`/api/v1/users${qs}`);
};

export const createUser = (input: CreateUserInput) =>
  fetchClient<User>("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateUser = (id: string, input: UpdateUserInput) =>
  fetchClient<User>(`/api/v1/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const updateUserStatus = (id: string, input: UpdateUserStatusInput) =>
  fetchClient<User>(`/api/v1/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

// Roles directly assigned to a user (no parent expansion). The user
// inherits permissions transitively from each role's parent chain
// server-side, so the UI just needs the direct memberships.
export const listUserRoles = (userId: string) =>
  fetchClient<Role[]>(`/api/v1/users/${encodeURIComponent(userId)}/roles`);
