import { fetchClient } from "./client";

export interface ConversationProfileV2 {
  id: string;
  tenant_id?: string;
  profile_id: string;
  description?: string;
  user_id_prefix?: string;
  user_id?: string;
  executor_type?: string;
  memory_schema?: unknown;
  agents: unknown;
  connections?: unknown;
  input_defaults?: unknown;
  metadata?: unknown;
  created_at: string;
  updated_at: string;
}

export interface ProfileWriteInput {
  id: string;
  tenant_slug?: string;
  description?: string;
  user_id_prefix?: string;
  user_id?: string;
  executor_type?: string;
  memory_schema?: unknown;
  agents: unknown;
  connections?: unknown;
  input_defaults?: unknown;
  metadata?: unknown;
}

export const listProfilesV2 = (tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<ConversationProfileV2[]>(`/api/v1/profiles${qs}`);
};

export const upsertProfile = (input: ProfileWriteInput) =>
  fetchClient<ConversationProfileV2>("/api/v1/profiles", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const deleteProfile = (id: string, tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<{ status: string }>(`/api/v1/profiles/${encodeURIComponent(id)}${qs}`, {
    method: "DELETE",
  });
};
