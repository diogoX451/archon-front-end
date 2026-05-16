import { fetchClient } from "./client";

export type WorkflowEventType =
  | "command"
  | "interaction"
  | "need"
  | "response"
  | "result"
  | "conversation_turn"
  | "other";

export interface WorkflowEvent {
  id?: string;
  tenant_id?: string;
  subject: string;
  event_type: WorkflowEventType;
  workflow_id?: string;
  conversation_id?: string;
  agent_id?: string;
  correlation_id?: string;
  payload: unknown;
  occurred_at?: string;
  received_at?: string;
}

export const getWorkflowTimeline = (workflowId: string, limit = 500) =>
  fetchClient<WorkflowEvent[]>(
    `/api/v1/workflows/${encodeURIComponent(workflowId)}/timeline?limit=${limit}`,
  );

export const getConversationTimeline = (conversationId: string, limit = 500) =>
  fetchClient<WorkflowEvent[]>(
    `/api/v1/conversations/${encodeURIComponent(conversationId)}/timeline?limit=${limit}`,
  );

export const getEventsTimeline = (params?: { tenant?: string; limit?: number }) => {
  const q = new URLSearchParams();
  if (params?.tenant) q.set("tenant", params.tenant);
  q.set("limit", String(params?.limit ?? 200));
  return fetchClient<WorkflowEvent[]>(`/api/v1/events/timeline?${q.toString()}`);
};

export interface WorkflowSummary {
  workflow_id: string;
  tenant_id?: string;
  status?: string;
  started_at: string;
  last_event_at: string;
  event_count: number;
  event_types: string[];
}

export const getWorkflowSummaries = (params?: { tenant?: string; limit?: number }) => {
  const q = new URLSearchParams();
  if (params?.tenant) q.set("tenant", params.tenant);
  q.set("limit", String(params?.limit ?? 200));
  return fetchClient<WorkflowSummary[]>(`/api/v1/events/workflows?${q.toString()}`);
};
