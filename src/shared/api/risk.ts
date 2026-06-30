import { fetchClient } from "./client";

export type RiskSeverity = "none" | "low" | "medium" | "high" | "critical" | "unknown";
export type ReviewStatus = "pending" | "reviewed";

export interface RiskFinding {
  category: string; // configurable taxonomy — free string
  severity: RiskSeverity;
  evidence: string;
  rationale: string;
}

export interface RiskClassification {
  overall_severity: RiskSeverity;
  summary: string;
  findings: RiskFinding[];
  prompt_version?: string;
}

export interface RiskRecord {
  id: string;
  event_id?: string;
  tenant_id: string;
  conversation_id: string;
  audio_message_id?: string;
  audio_key?: string;
  model?: string;
  classification: RiskClassification;
  review_status: ReviewStatus;
  created_at: string;
  // PT-BR display labels resolved server-side from the tenant's risk config.
  // classification_label: the single "Classificação" (top finding category or
  // "Alarme falso"); severity_label: the "Nível de criticidade"; finding_labels:
  // per-finding category labels, aligned with classification.findings.
  classification_label?: string;
  severity_label?: string;
  finding_labels?: string[];
}

export interface RiskListResponse {
  classifications: RiskRecord[];
}

export interface RiskListFilter {
  minSeverity?: RiskSeverity;
  onlyPending?: boolean;
  limit?: number;
}

export const listRiskClassifications = (filter: RiskListFilter = {}) => {
  const qs = new URLSearchParams();
  if (filter.minSeverity) qs.set("min_severity", filter.minSeverity);
  if (filter.onlyPending) qs.set("only_pending", "true");
  if (filter.limit) qs.set("limit", String(filter.limit));
  const q = qs.toString();
  return fetchClient<RiskListResponse>(`/api/v1/risk/classifications${q ? `?${q}` : ""}`);
};

export const getRiskClassification = (id: string) =>
  fetchClient<RiskRecord>(`/api/v1/risk/classifications/${encodeURIComponent(id)}`);

export const reviewRiskClassification = (id: string) =>
  fetchClient<{ id: string; review_status: ReviewStatus }>(
    `/api/v1/risk/classifications/${encodeURIComponent(id)}/review`,
    { method: "POST" }
  );
