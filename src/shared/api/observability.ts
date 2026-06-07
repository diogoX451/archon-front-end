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

export const getUsageTimeseries = async (params?: {
  bucket?: UsageBucket;
  from?: string;
  to?: string;
}): Promise<UsageTimeseriesRow[]> => {
  const q = new URLSearchParams();
  if (params?.bucket) q.set("bucket", params.bucket);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const qs = q.toString() ? `?${q}` : "";
  const raw = await fetchClient<UsageTimeseriesRow[] | { buckets: Array<{ ts: string; groups: Array<{ calls: number; cost_usd: number; input_tokens: number; output_tokens: number }> }> }>(`/api/v1/usage/timeseries${qs}`);
  if (Array.isArray(raw)) return raw;
  return (raw as { buckets: Array<{ ts: string; groups: Array<{ calls: number; cost_usd: number; input_tokens: number; output_tokens: number }> }> }).buckets.map(b => ({
    bucket_ts: b.ts,
    calls: b.groups.reduce((s, g) => s + g.calls, 0),
    input_tokens: b.groups.reduce((s, g) => s + g.input_tokens, 0),
    output_tokens: b.groups.reduce((s, g) => s + g.output_tokens, 0),
    cost_usd: b.groups.reduce((s, g) => s + g.cost_usd, 0),
  }));
};

export const getUsageBreakdown = async (params?: {
  dimension?: UsageDimension;
  from?: string;
  to?: string;
}): Promise<UsageBreakdownRow[]> => {
  const q = new URLSearchParams();
  if (params?.dimension) q.set("dimension", params.dimension);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const qs = q.toString() ? `?${q}` : "";
  const raw = await fetchClient<UsageBreakdownRow[] | Array<{ dimension_value: string; calls: number; cost_usd: number; pct_calls: number; pct_cost: number }>>(`/api/v1/usage/breakdown${qs}`);
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if ("dimension_value" in raw[0]) {
    return (raw as Array<{ dimension_value: string; calls: number; cost_usd: number; pct_calls: number; pct_cost: number }>).map(r => ({
      dimension: r.dimension_value,
      calls: r.calls,
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: r.cost_usd,
      call_pct: r.pct_calls,
      cost_pct: r.pct_cost,
    }));
  }
  return raw as UsageBreakdownRow[];
};

export const getTrailBlocked = () =>
  fetchClient<TrailBlockedEvent[]>("/api/v1/trail/blocked");

export interface TrailEvent {
  event_id: string;
  session_id: string;
  workflow_id: string;
  agent_id: string;
  ts: string;
  sequence: number;
  action_type: string | number;
  tool_name?: string;
  error?: string;
}

export interface TrailTimelineResponse {
  events: TrailEvent[];
}

export const getTrailTimeline = (sessionId: string) =>
  fetchClient<TrailTimelineResponse>(`/api/v1/trail/sessions/${encodeURIComponent(sessionId)}/timeline`);
