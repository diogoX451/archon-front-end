import { useQuery } from "@tanstack/react-query";
import { listPermissions } from "@shared/api/permissions";

export const usePermissionsCatalogue = () =>
  useQuery({
    queryKey: ["permissions-catalogue"],
    queryFn: listPermissions,
  });
