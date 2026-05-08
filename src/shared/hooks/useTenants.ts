import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTenant, listTenants, type CreateTenantInput } from "@shared/api/tenants";

export const useTenants = () =>
  useQuery({
    queryKey: ["tenants"],
    queryFn: listTenants,
  });

export const useCreateTenant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTenantInput) => createTenant(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
};
