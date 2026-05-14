import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  associateRolePermission,
  createRole,
  deleteRole,
  dissociateRolePermission,
  listRoleAllowedPermissions,
  listRoleEffectivePermissions,
  listRoles,
  updateRole,
  type CreateRoleInput,
  type UpdateRoleInput,
} from "@shared/api/roles";

const ROLES_KEY = "roles";

export const useRoles = (tenantSlug?: string) =>
  useQuery({
    queryKey: [ROLES_KEY, tenantSlug || "_all"],
    queryFn: () => listRoles(tenantSlug),
  });

export const useRoleEffectivePermissions = (id: string | null) =>
  useQuery({
    queryKey: [ROLES_KEY, id, "effective"],
    queryFn: () => listRoleEffectivePermissions(id || ""),
    enabled: !!id,
  });

export const useRoleAllowedPermissions = (id: string | null) =>
  useQuery({
    queryKey: [ROLES_KEY, id, "allowed"],
    queryFn: () => listRoleAllowedPermissions(id || ""),
    enabled: !!id,
  });

export const useCreateRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => createRole(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ROLES_KEY] });
    },
  });
};

export const useUpdateRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRoleInput) => updateRole(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ROLES_KEY] });
    },
  });
};

export const useDeleteRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ROLES_KEY] });
    },
  });
};

// Associate / dissociate hit the same query keys as the role itself so
// the "effective permissions" panel reloads after a toggle.
export const useAssociateRolePermission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, key }: { roleId: string; key: string }) =>
      associateRolePermission(roleId, key),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [ROLES_KEY, vars.roleId, "effective"] });
    },
  });
};

export const useDissociateRolePermission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, key }: { roleId: string; key: string }) =>
      dissociateRolePermission(roleId, key),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [ROLES_KEY, vars.roleId, "effective"] });
    },
  });
};
