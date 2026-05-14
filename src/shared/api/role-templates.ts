import { fetchClient } from "./client";
import type { Role } from "./roles";
import { associateRolePermission, dissociateRolePermission, listRoleEffectivePermissions } from "./roles";

// Role templates are super-admin-owned roots that every tenant's
// managed clones inherit from. Changes propagate to all tenants on the
// next login (recursive CTE in GetUserPermissionKeys).
//
// The /role-templates endpoints are super-admin-only on the backend;
// permission edits on a template reuse the standard
// /roles/permissions endpoints (a template *is* a role).

export interface CreateRoleTemplateInput {
  name: string;
  description?: string;
  resource_type: string;
  resource_id?: string;
}

export interface UpdateRoleTemplateInput {
  name?: string;
  description?: string;
}

export const listRoleTemplates = () =>
  fetchClient<Role[]>("/api/v1/role-templates");

export const createRoleTemplate = (input: CreateRoleTemplateInput) =>
  fetchClient<Role>("/api/v1/role-templates", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateRoleTemplate = (id: string, input: UpdateRoleTemplateInput) =>
  fetchClient<Role>(`/api/v1/role-templates/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const deleteRoleTemplate = (id: string) =>
  fetchClient<{ status: string }>(`/api/v1/role-templates/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

// Re-exported so the PermissionsPage can edit a template's permissions
// without importing from the lower-level roles client.
export {
  listRoleEffectivePermissions as listTemplatePermissions,
  associateRolePermission as associateTemplatePermission,
  dissociateRolePermission as dissociateTemplatePermission,
};
