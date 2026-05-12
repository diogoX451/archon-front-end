import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, listUsers, type CreateUserInput } from "@shared/api/users";

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
