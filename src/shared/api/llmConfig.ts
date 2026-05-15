import { fetchClient } from "./client";

export interface LLMConfig {
  id: string;
  tenant_id: string;
  provider: string;
  model: string;
  api_key?: string; // always empty in list responses (redacted server-side)
  base_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UpsertLLMConfigInput {
  provider?: string;
  model: string;
  api_key?: string;
  base_url?: string;
  tenant_slug?: string;
}

export const listLLMConfigs = (tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<LLMConfig[]>(`/api/v1/config/llm${qs}`);
};

export const upsertLLMConfig = (input: UpsertLLMConfigInput, tenantSlug?: string) => {
  const body = tenantSlug ? { ...input, tenant_slug: tenantSlug } : input;
  return fetchClient<LLMConfig>(`/api/v1/config/llm`, {
    method: "POST",
    body: JSON.stringify(body),
  });
};

export const deleteLLMConfig = (provider: string, tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<void>(`/api/v1/config/llm/${encodeURIComponent(provider)}${qs}`, {
    method: "DELETE",
  });
};
