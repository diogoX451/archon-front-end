import { fetchClient } from "./client";

export interface ConversationRow {
  id: string;
  tenant_id?: string;
  conversation_id: string;
  profile_id: string;
  user_id?: string;
  title?: string;
  preview?: string;
  message_count: number;
  last_message_at?: string;
  metadata?: unknown;
  created_at: string;
  updated_at: string;
}

export interface ConversationTurnRow {
  id: string;
  conversation_pk: string;
  tenant_id?: string;
  conversation_id: string;
  workflow_id?: string;
  role: "user" | "assistant";
  content: string;
  status: "pending" | "ok" | "failed";
  output?: any;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationTurnsResponse {
  conversation: ConversationRow;
  turns: ConversationTurnRow[];
  next_cursor?: string | null;
  has_more?: boolean;
}

export interface ConversationsPage {
  items: ConversationRow[];
  next_cursor?: string | null;
  has_more?: boolean;
}

export const listConversations = (params?: { tenantSlug?: string; before?: string; limit?: number }) => {
  const search = new URLSearchParams();
  if (params?.tenantSlug) search.set("tenant", params.tenantSlug);
  if (params?.before) search.set("before", params.before);
  if (params?.limit) search.set("limit", String(params.limit));
  // Force cursor mode even on the first page so the response is paginated.
  search.set("cursor", "true");
  const qs = search.toString() ? `?${search.toString()}` : "";
  return fetchClient<ConversationsPage>(`/api/v1/conversations${qs}`);
};

export const getConversation = (id: string, tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<ConversationRow>(`/api/v1/conversations/${encodeURIComponent(id)}${qs}`);
};

export const listConversationTurns = (
  id: string,
  params?: { tenantSlug?: string; after?: string; limit?: number }
) => {
  const search = new URLSearchParams();
  if (params?.tenantSlug) search.set("tenant", params.tenantSlug);
  if (params?.after) search.set("after", params.after);
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString() ? `?${search.toString()}` : "";
  return fetchClient<ConversationTurnsResponse>(
    `/api/v1/conversations/${encodeURIComponent(id)}/turns${qs}`
  );
};

export const editConversationTurn = (
  conversationId: string,
  turnId: string,
  content: string,
  tenantSlug?: string
) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<ConversationTurnRow>(
    `/api/v1/conversations/${encodeURIComponent(conversationId)}/turns/${encodeURIComponent(turnId)}${qs}`,
    { method: "PATCH", body: JSON.stringify({ content }) }
  );
};

export const regenerateConversationTurn = (
  conversationId: string,
  turnId: string,
  profileId?: string,
  tenantSlug?: string
) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<{
    workflow_id: string;
    conversation_id: string;
    profile_id: string;
    turn: ConversationTurnRow;
  }>(
    `/api/v1/conversations/${encodeURIComponent(conversationId)}/turns/${encodeURIComponent(turnId)}/regenerate${qs}`,
    { method: "POST", body: JSON.stringify({ profile_id: profileId }) }
  );
};

export const deleteConversation = (id: string, tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<{ status: string }>(
    `/api/v1/conversations/${encodeURIComponent(id)}${qs}`,
    { method: "DELETE" }
  );
};
