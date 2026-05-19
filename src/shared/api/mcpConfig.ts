import { fetchClient } from "./client";

export type MCPTransport = "sse" | "streamable_http";

export interface MCPConfig {
  id: string;
  tenant_id: string;
  name: string;
  transport: MCPTransport;
  url: string;
  auth_token?: string; // always empty in list responses (redacted server-side)
  metadata?: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpsertMCPConfigInput {
  name: string;
  transport: MCPTransport;
  url: string;
  auth_token?: string;
  metadata?: Record<string, unknown>;
  enabled?: boolean;
  tenant_slug?: string;
}

export const listMCPConfigs = (tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<MCPConfig[]>(`/api/v1/config/mcp${qs}`);
};

export const upsertMCPConfig = (input: UpsertMCPConfigInput, tenantSlug?: string) => {
  const body = tenantSlug ? { ...input, tenant_slug: tenantSlug } : input;
  return fetchClient<MCPConfig>(`/api/v1/config/mcp`, {
    method: "POST",
    body: JSON.stringify(body),
  });
};

export const deleteMCPConfig = (name: string, tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<void>(`/api/v1/config/mcp/${encodeURIComponent(name)}${qs}`, {
    method: "DELETE",
  });
};
