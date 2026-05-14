import { fetchClient } from "./client";

// Role mirrors auth.Role on the backend. The inheritance flags drive
// UI affordances:
//   - is_template: super-admin-only root; tenants can't see them in
//     /roles, only via the dedicated /role-templates client.
//   - is_managed: tenant clone auto-created when the tenant was
//     provisioned; the tenant may *extend* its permissions but the
//     identity (parent, resource_type) is locked.
export interface Role {
  id: string;
  tenant_id?: string;
  name: string;
  description?: string;
  parent_role_id?: string;
  resource_type: string;
  resource_id?: string;
  is_template: boolean;
  is_managed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleInput {
  tenant_slug?: string;
  name: string;
  description?: string;
  parent_role_id: string;
  resource_type: string;
  resource_id?: string;
}

export interface UpdateRoleInput {
  id: string;
  name?: string;
  description?: string;
  parent_role_id?: string;
  resource_type?: string;
  resource_id?: string;
}

// EffectivePermission is returned by /roles/{id}/effective-permissions.
// The `source` field tells the UI whether to render the row as locked
// (inherited from a template/parent) or editable ("own").
export interface EffectivePermission {
  key: string;
  source: "own" | "inherited";
}

export const listRoles = (tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<Role[]>(`/api/v1/roles${qs}`);
};

export const getRole = (id: string) =>
  fetchClient<Role>(`/api/v1/roles/${encodeURIComponent(id)}`);

export const createRole = (input: CreateRoleInput) =>
  fetchClient<Role>("/api/v1/roles", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateRole = (input: UpdateRoleInput) =>
  fetchClient<Role>("/api/v1/roles", {
    method: "PUT",
    body: JSON.stringify(input),
  });

export const deleteRole = (id: string) =>
  fetchClient<{ status: string }>(`/api/v1/roles/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

export const associateRolePermission = (roleId: string, permissionKey: string) =>
  fetchClient<{ status: string }>("/api/v1/roles/permissions", {
    method: "POST",
    body: JSON.stringify({ role_id: roleId, permission_key: permissionKey }),
  });

// Dissociation reuses the same endpoint shape on the backend
// (handleAssociatePermission with explicit dissociate). We add a
// thin wrapper so callers don't repeat the body construction.
export const dissociateRolePermission = (roleId: string, permissionKey: string) =>
  fetchClient<{ status: string }>("/api/v1/roles/permissions", {
    method: "DELETE",
    body: JSON.stringify({ role_id: roleId, permission_key: permissionKey }),
  });

export const associateRoleWithUser = (userId: string, roleId: string) =>
  fetchClient<{ status: string }>("/api/v1/roles/users", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, role_id: roleId }),
  });

export const dissociateRoleWithUser = (userId: string, roleId: string) =>
  fetchClient<{ status: string }>("/api/v1/roles/users", {
    method: "DELETE",
    body: JSON.stringify({ user_id: userId, role_id: roleId }),
  });

export const listRoleEffectivePermissions = (id: string) =>
  fetchClient<EffectivePermission[]>(
    `/api/v1/roles/${encodeURIComponent(id)}/effective-permissions`,
  );

export const listRoleAllowedPermissions = (id: string) =>
  fetchClient<string[]>(
    `/api/v1/roles/${encodeURIComponent(id)}/allowed-permissions`,
  );
