import { fetchClient } from "./client";

// ── Tipos de request ────────────────────────────────────────────────────────

export interface UsageTimeRange {
  from?: string; // RFC3339
  to?: string;   // RFC3339
}

export type UsageBucket = "hour" | "day" | "month";
export type UsageGroupBy = "provider" | "model" | "purpose" | "tenant_id" | "workflow_id";
export type UsageDimension = "purpose" | "provider" | "model";

export interface UsageSummaryParams extends UsageTimeRange {
  tenant_id?: string;
  provider?: string;
  model?: string;
  purpose?: string;
  workflow_id?: string;
}

export interface UsageTimeseriesParams extends UsageTimeRange {
  bucket?: UsageBucket;
  group_by?: UsageGroupBy[];
}

export interface UsageByTenantParams extends UsageTimeRange {}

export interface UsageBreakdownParams extends UsageTimeRange {
  dimension?: UsageDimension;
}

export interface UsageEventsParams extends UsageTimeRange {
  limit?: number;
  cursor?: string;
}

export interface UsagePricingParams {
  provider?: string;
  model?: string;
  as_of?: string; // RFC3339
}

// ── Tipos de response ───────────────────────────────────────────────────────

export interface UsageSummary {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  cost_usd: number;
  avg_latency_ms: number;
}

export interface UsageTimeseriesGroup {
  provider?: string;
  model?: string;
  purpose?: string;
  tenant_id?: string;
  workflow_id?: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface UsageTimeseriesBucket {
  ts: string; // RFC3339
  groups: UsageTimeseriesGroup[];
}

export interface UsageTimeseriesResponse {
  buckets: UsageTimeseriesBucket[];
}

export interface UsageByWorkflowRow {
  purpose: string;
  provider: string;
  model: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  cost_usd: number;
  avg_latency_ms: number;
}

export interface UsageByTenantRow {
  day: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  cost_usd: number;
}

export interface UsageBreakdownRow {
  dimension_value: string;
  calls: number;
  cost_usd: number;
  pct_calls: number;
  pct_cost: number;
}

export interface UsageEvent {
  id: number;
  ts: string; // RFC3339
  tenant_id: string;
  workflow_id: string;
  provider: string;
  model: string;
  purpose: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  cost_usd: number;
  latency_ms: number;
}

export interface UsageEventsResponse {
  events: UsageEvent[];
  next_cursor: string;
}

export interface PricingRow {
  provider: string;
  model: string;
  input_per_1m_usd: number;
  output_per_1m_usd: number;
  cached_input_per_1m?: number;
  effective_from: string; // RFC3339
  effective_to?: string;  // RFC3339
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type QueryParams = object & Record<string, string | number | boolean | string[] | undefined>;

function buildQS<T extends object>(params: T): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params as QueryParams)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length > 0) q.set(key, value.join(","));
    } else {
      q.set(key, String(value));
    }
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

// ── API calls ────────────────────────────────────────────────────────────────

/** Totais agregados no intervalo. Suporta filtros opcionais por provider, model, purpose, workflow_id. */
export const getUsageSummary = (params: UsageSummaryParams = {}) =>
  fetchClient<UsageSummary>(`/api/v1/usage/summary${buildQS(params)}`);

/** Série temporal por bucket (hour/day/month) com group_by opcional. */
export const getUsageTimeseries = (params: UsageTimeseriesParams = {}) => {
  const { group_by, ...rest } = params;
  return fetchClient<UsageTimeseriesResponse>(
    `/api/v1/usage/timeseries${buildQS({ ...rest, group_by })}`
  );
};

/** Breakdown de custo de uma execução específica (por purpose + provider + model). */
export const getUsageByWorkflow = (workflowId: string) =>
  fetchClient<UsageByWorkflowRow[]>(`/api/v1/usage/by-workflow/${encodeURIComponent(workflowId)}`);

/** Relatório diário por tenant — requer super-admin. */
export const getUsageByTenant = (tenantId: string, params: UsageByTenantParams = {}) =>
  fetchClient<UsageByTenantRow[]>(
    `/api/v1/usage/by-tenant/${encodeURIComponent(tenantId)}${buildQS(params)}`
  );

/** Distribuição percentual de calls e custo por uma dimensão (purpose/provider/model). */
export const getUsageBreakdown = (params: UsageBreakdownParams = {}) =>
  fetchClient<UsageBreakdownRow[]>(`/api/v1/usage/breakdown${buildQS(params)}`);

/** Listagem paginada de eventos crus — requer super-admin. */
export const getUsageEvents = (params: UsageEventsParams = {}) =>
  fetchClient<UsageEventsResponse>(`/api/v1/usage/events${buildQS(params)}`);

/** Tabela de pricing vigente (ou em determinada data via as_of). */
export const getUsagePricing = (params: UsagePricingParams = {}) =>
  fetchClient<PricingRow[]>(`/api/v1/usage/pricing${buildQS(params)}`);
