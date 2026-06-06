import { fetchClient } from "./client";

export interface UsageSummary {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  cost_usd: number;
  avg_latency_ms: number;
}

export interface UsageTimeseriesRow {
  bucket_ts: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  [key: string]: string | number;
}

export interface UsageBreakdownRow {
  dimension: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  call_pct: number;
  cost_pct: number;
}

export interface TrailBlockedEvent {
  event_id: string;
  session_id: string;
  tool: string;
  reason: string;
  ts: string;
}

export type UsageBucket = "hour" | "day" | "month";
export type UsageDimension = "purpose" | "provider" | "model";

export const getUsageSummary = (params?: {
  from?: string;
  to?: string;
  workflow_id?: string;
}) => {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.workflow_id) q.set("workflow_id", params.workflow_id);
  const qs = q.toString() ? `?${q}` : "";
  return fetchClient<UsageSummary>(`/api/v1/usage/summary${qs}`);
};

export const getUsageTimeseries = (params?: {
  bucket?: UsageBucket;
  from?: string;
  to?: string;
}) => {
  const q = new URLSearchParams();
  if (params?.bucket) q.set("bucket", params.bucket);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const qs = q.toString() ? `?${q}` : "";
  return fetchClient<UsageTimeseriesRow[]>(`/api/v1/usage/timeseries${qs}`);
};

export const getUsageBreakdown = (params?: {
  dimension?: UsageDimension;
  from?: string;
  to?: string;
}) => {
  const q = new URLSearchParams();
  if (params?.dimension) q.set("dimension", params.dimension);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const qs = q.toString() ? `?${q}` : "";
  return fetchClient<UsageBreakdownRow[]>(`/api/v1/usage/breakdown${qs}`);
};

export const getTrailBlocked = () =>
  fetchClient<TrailBlockedEvent[]>("/api/v1/trail/blocked");
