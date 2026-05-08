import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteProfile, listProfilesV2, upsertProfile, type ProfileWriteInput } from "@shared/api/profiles";

export const useProfiles = (tenantSlug?: string) =>
  useQuery({
    queryKey: ["profiles", tenantSlug || "all"],
    queryFn: () => listProfilesV2(tenantSlug),
  });

export const useUpsertProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileWriteInput) => upsertProfile(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
};

export const useDeleteProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; tenantSlug?: string }) => deleteProfile(args.id, args.tenantSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
};
