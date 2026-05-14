import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  listUserRoles,
  listUsers,
  updateUser,
  updateUserStatus,
  type CreateUserInput,
  type UpdateUserInput,
  type UpdateUserStatusInput,
} from "@shared/api/users";
import {
  associateRoleWithUser,
  dissociateRoleWithUser,
} from "@shared/api/roles";

export const useUsers = (tenantSlug?: string) =>
  useQuery({
    queryKey: ["users", tenantSlug || "all"],
    queryFn: () => listUsers(tenantSlug),
  });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => updateUser(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useUpdateUserStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserStatusInput }) => updateUserStatus(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

// Roles assigned directly to the user. Used by the "Papéis" modal in
// ProfilesPage; the modal pairs it with useRoles() to render checkboxes
// against the tenant's role catalogue.
export const useUserRoles = (userId: string | null) =>
  useQuery({
    queryKey: ["users", userId, "roles"],
    queryFn: () => listUserRoles(userId || ""),
    enabled: !!userId,
  });

export const useAssociateRoleWithUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      associateRoleWithUser(userId, roleId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["users", vars.userId, "roles"] });
    },
  });
};

export const useDissociateRoleWithUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      dissociateRoleWithUser(userId, roleId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["users", vars.userId, "roles"] });
    },
  });
};
