import { useQuery } from "@tanstack/react-query";
import { getUserGraphProfile, type UserGraphProfile } from "@shared/api/graphProfile";

export const graphProfileKeys = {
  all: ["graph-profile"] as const,
  user: (userId: string) => [...graphProfileKeys.all, userId] as const,
};

export const useGraphProfile = (
  userId?: string,
  options?: { enabled?: boolean }
) =>
  useQuery<UserGraphProfile>({
    queryKey: graphProfileKeys.user(userId ?? ""),
    queryFn: () => getUserGraphProfile(userId!),
    enabled: !!userId && (options?.enabled ?? true),
    retry: false,
  });
