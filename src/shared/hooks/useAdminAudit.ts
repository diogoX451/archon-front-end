import { useQuery } from "@tanstack/react-query";
import { listAdminAudit, type AdminAuditFilter } from "@shared/api/adminAudit";

const AUDIT_KEY = "admin_audit";

export const useAdminAudit = (filter: AdminAuditFilter = {}) =>
  useQuery({
    queryKey: [AUDIT_KEY, filter],
    queryFn: () => listAdminAudit(filter),
  });
