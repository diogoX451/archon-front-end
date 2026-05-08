const API_URL = import.meta.env.VITE_ARCHON_API_URL ?? "http://localhost:8080";

export type Json = Record<string, unknown>;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const body = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    throw new Error(JSON.stringify(body));
  }
  return body;
}

export const api = {
  listProfiles: () => request<Json[]>("/api/v1/conversation/profiles"),
  getWorkflowStatus: (id: string) => request<Json>(`/api/v1/workflows/${id}/status`),
  getWorkflowResult: (id: string) => request<Json>(`/api/v1/workflows/${id}/result`),
  createTurn: (payload: Json) => request<Json>("/api/v1/conversation/turns", { method: "POST", body: JSON.stringify(payload) }),
  publishRequestedEvent: (payload: Json) => request<Json>("/api/v1/conversation/events/requested", { method: "POST", body: JSON.stringify(payload) }),
  ragIngest: (payload: Json) => request<Json>("/api/v1/rag/ingest", { method: "POST", body: JSON.stringify(payload) }),
  ragQuery: (payload: Json) => request<Json>("/api/v1/rag/query", { method: "POST", body: JSON.stringify(payload) })
};
