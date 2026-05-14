import { fetchClient } from "./client";

export interface AdminAuditEntry {
  id: string;
  occurred_at: string;
  tenant_id?: string;
  tenant_slug?: string;
  actor_id?: string;
  actor_email?: string;
  method: string;
  path: string;
  route?: string;
  target_type?: string;
  target_id?: string;
  action?: string;
  status_code: number;
  duration_ms: number;
  ip?: string;
  user_agent?: string;
  request_summary?: unknown;
}

export interface AdminAuditFilter {
  tenant?: string;
  actor_id?: string;
  target_type?: string;
  target_id?: string;
  since?: string; // RFC3339
  until?: string; // RFC3339
  limit?: number;
}

export const listAdminAudit = (filter: AdminAuditFilter = {}) => {
  const qs = new URLSearchParams();
  if (filter.tenant) qs.set("tenant", filter.tenant);
  if (filter.actor_id) qs.set("actor_id", filter.actor_id);
  if (filter.target_type) qs.set("target_type", filter.target_type);
  if (filter.target_id) qs.set("target_id", filter.target_id);
  if (filter.since) qs.set("since", filter.since);
  if (filter.until) qs.set("until", filter.until);
  if (filter.limit) qs.set("limit", String(filter.limit));
  const q = qs.toString();
  return fetchClient<AdminAuditEntry[]>(`/api/v1/admin/audit-log${q ? `?${q}` : ""}`);
};
