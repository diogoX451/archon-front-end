import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  listUsers,
  updateUser,
  updateUserStatus,
  type CreateUserInput,
  type UpdateUserInput,
  type UpdateUserStatusInput,
} from "@shared/api/users";

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
