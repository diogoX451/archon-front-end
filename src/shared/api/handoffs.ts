import { fetchClient } from "./client";

export type HandoffStatus = "pending" | "active" | "closed";
export type HandoffReason = "lead_qualified" | "guardrail_block";

export interface Handoff {
  ID: string;
  TenantID: string;
  ConversationID: string;
  CorrelationID: string;
  Reason: HandoffReason | number;
  Status: HandoffStatus | number;
  AssignedTo: string;
  ClosingSummary: string;
  CreatedAt: string;
  ActivatedAt: string | null;
  ClosedAt: string | null;
}

export interface HandoffsResponse {
  handoffs: Handoff[];
}

export interface CloseHandoffRequest {
  summary: string;
}

export interface AssignHandoffRequest {
  assigned_to: string;
}

export const listHandoffs = (params?: { tenantSlug?: string }) => {
  const search = new URLSearchParams();
  if (params?.tenantSlug) search.set("tenant_id", params.tenantSlug);
  const qs = search.toString() ? `?${search.toString()}` : "";
  return fetchClient<HandoffsResponse>(`/api/v1/handoffs${qs}`);
};

export const closeHandoff = (id: string, body: CloseHandoffRequest) =>
  fetchClient<{ ok: boolean; handoff_id: string }>(`/api/v1/handoffs/${encodeURIComponent(id)}/close`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const assignHandoff = (id: string, body: AssignHandoffRequest) =>
  fetchClient<{ ok: boolean; handoff_id: string; assigned_to: string }>(
    `/api/v1/handoffs/${encodeURIComponent(id)}/assign`,
    { method: "POST", body: JSON.stringify(body) }
  );

export function handoffStatusLabel(h: Handoff): HandoffStatus {
  if (typeof h.Status === "number") return (["pending", "active", "closed"][h.Status] ?? "pending") as HandoffStatus;
  return h.Status as HandoffStatus;
}

export function handoffReasonLabel(h: Handoff): string {
  const r = typeof h.Reason === "number" ? (["lead_qualified", "guardrail_block"][h.Reason] ?? "lead_qualified") : h.Reason;
  return r === "guardrail_block" ? "Guardrail" : "Lead qualificado";
}
