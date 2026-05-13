import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTenant,
  listTenants,
  updateTenant,
  updateTenantStatus,
  type CreateTenantInput,
  type UpdateTenantInput,
  type UpdateTenantStatusInput,
} from "@shared/api/tenants";

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

export const useUpdateTenant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTenantInput }) => updateTenant(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
};

export const useUpdateTenantStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTenantStatusInput }) => updateTenantStatus(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
};
