import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createKB, deleteKB, listKBs, updateKB, type KBWriteInput } from "@shared/api/kbs";

export const useKBs = (tenantSlug: string) =>
  useQuery({
    queryKey: ["kbs", tenantSlug],
    queryFn: () => listKBs(tenantSlug),
    enabled: !!tenantSlug,
  });

export const useCreateKB = (tenantSlug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: KBWriteInput) => createKB(tenantSlug, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kbs", tenantSlug] });
    },
  });
};

export const useUpdateKB = (tenantSlug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { kbID: string; input: Partial<KBWriteInput> }) => updateKB(tenantSlug, args.kbID, args.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kbs", tenantSlug] });
    },
  });
};

export const useDeleteKB = (tenantSlug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kbID: string) => deleteKB(tenantSlug, kbID),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kbs", tenantSlug] });
    },
  });
};
