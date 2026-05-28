import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignHandoff,
  closeHandoff,
  listHandoffs,
  type HandoffsResponse,
} from "@shared/api/handoffs";
import { getActiveTenantSlug } from "@shared/api/token";

export const handoffKeys = {
  all: ["handoffs"] as const,
  list: (tenantSlug?: string) => [...handoffKeys.all, "list", tenantSlug ?? "all"] as const,
};

export const useHandoffsList = (options?: { enabled?: boolean; refetchInterval?: number | false }) => {
  const tenantSlug = getActiveTenantSlug() ?? undefined;
  return useQuery<HandoffsResponse>({
    queryKey: handoffKeys.list(tenantSlug),
    queryFn: () => listHandoffs({ tenantSlug }),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
};

export const useCloseHandoff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; summary: string }) =>
      closeHandoff(args.id, { summary: args.summary }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: handoffKeys.all });
    },
  });
};

export const useAssignHandoff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; assignedTo: string }) =>
      assignHandoff(args.id, { assigned_to: args.assignedTo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: handoffKeys.all });
    },
  });
};
