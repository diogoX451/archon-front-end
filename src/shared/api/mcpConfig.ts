import { fetchClient } from "./client";

export type MCPTransport = "sse" | "streamable_http";
export type MCPAuthMode = "none" | "static_bearer" | "oauth2_authorization_code" | "oauth2_client_credentials";
export type MCPProviderPreset = "" | "google" | "github" | "microsoft";

export interface StaticBearerConfig {
  token?: string;
}

export interface OAuth2Config {
  issuer?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  revocation_endpoint?: string;
  registration_endpoint?: string;
  discovery_url?: string;
  discovery_fetched_at?: string;
  client_id?: string;
  client_secret?: string;
  dynamic_registration?: boolean;
  registration_token?: string;
  scopes?: string[];
  audience?: string;
  use_pkce?: boolean;
  redirect_uri?: string;
  preset?: MCPProviderPreset;
}

export interface MCPAuthConfig {
  mode: MCPAuthMode;
  static_bearer?: StaticBearerConfig;
  oauth2?: OAuth2Config;
}

export interface MCPConfig {
  id: string;
  tenant_id: string;
  name: string;
  transport: MCPTransport;
  url: string;
  auth?: MCPAuthConfig;
  auth_token?: string; // legacy, only present on older API responses
  metadata?: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpsertMCPConfigInput {
  name: string;
  transport: MCPTransport;
  url: string;
  auth?: MCPAuthConfig;
  auth_token?: string;
  metadata?: Record<string, unknown>;
  enabled?: boolean;
  tenant_slug?: string;
}

export interface OAuthStartRequest {
  initiator_user_id: string;
  scopes_extra?: string[];
  audience?: string;
  redirect_uri_override?: string | null;
}

export interface OAuthStartResponse {
  authorize_url: string;
  state: string;
  expires_at: string;
}

export interface OAuthSubjectStatus {
  subject: string;
  display_name?: string;
  scopes_granted?: string[];
  expires_at?: string;
  last_used_at?: string;
  needs_reauth?: boolean;
}

export interface OAuthStatusResponse {
  connected: boolean;
  mode: MCPAuthMode | string;
  subjects: OAuthSubjectStatus[];
}

export interface OAuthClientCredentialsResponse {
  connected: boolean;
  expires_at: string;
  scopes_granted: string[];
}

export interface OAuthRefreshResponse {
  subject: string;
  expires_at: string;
}

export interface OAuthDiscoveryRefreshResponse {
  token_endpoint: string;
  authorization_endpoint: string;
  fetched_at: string;
}

export interface OAuthRegisterClientResponse {
  client_id: string;
}

const tenantQuery = (tenantSlug?: string) => tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";

export const listMCPConfigs = (tenantSlug?: string) => {
  return fetchClient<MCPConfig[]>(`/api/v1/config/mcp${tenantQuery(tenantSlug)}`);
};

export const upsertMCPConfig = (input: UpsertMCPConfigInput, tenantSlug?: string) => {
  const body = tenantSlug ? { ...input, tenant_slug: tenantSlug } : input;
  return fetchClient<MCPConfig>(`/api/v1/config/mcp`, {
    method: "POST",
    body: JSON.stringify(body),
  });
};

export const deleteMCPConfig = (name: string, tenantSlug?: string) => {
  return fetchClient<void>(`/api/v1/config/mcp/${encodeURIComponent(name)}${tenantQuery(tenantSlug)}`, {
    method: "DELETE",
  });
};

const oauthBase = (configID: string) => `/api/v1/mcp/${encodeURIComponent(configID)}/oauth`;

export const getMCPOAuthStatus = (configID: string) =>
  fetchClient<OAuthStatusResponse>(`${oauthBase(configID)}/status`);

export const listMCPOAuthSubjects = (configID: string) =>
  fetchClient<OAuthSubjectStatus[]>(`${oauthBase(configID)}/subjects`);

export const startMCPOAuth = (configID: string, input: OAuthStartRequest) =>
  fetchClient<OAuthStartResponse>(`${oauthBase(configID)}/start`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const issueMCPClientCredentials = (configID: string) =>
  fetchClient<OAuthClientCredentialsResponse>(`${oauthBase(configID)}/token`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const refreshMCPOAuthSubject = (configID: string, subject: string) =>
  fetchClient<OAuthRefreshResponse>(`${oauthBase(configID)}/refresh`, {
    method: "POST",
    body: JSON.stringify({ subject }),
  });

export const revokeMCPOAuthSubject = (configID: string, subject: string) =>
  fetchClient<void>(`${oauthBase(configID)}/subjects/${encodeURIComponent(subject)}`, {
    method: "DELETE",
  });

export const refreshMCPOAuthDiscovery = (configID: string) =>
  fetchClient<OAuthDiscoveryRefreshResponse>(`${oauthBase(configID)}/discovery/refresh`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const registerMCPOAuthClient = (configID: string) =>
  fetchClient<OAuthRegisterClientResponse>(`${oauthBase(configID)}/register`, {
    method: "POST",
    body: JSON.stringify({}),
  });
