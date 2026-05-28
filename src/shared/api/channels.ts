import { fetchClient } from "./client";

// ── Channel Links ────────────────────────────────────────────────────────────

export type LinkStatus = "active" | "paused" | "disconnected";
export type ChannelKind = "whatsapp" | "web" | "api" | string;

export interface ChannelLink {
  id: string;
  tenant_id: string;
  conversation_id: string;
  channel: ChannelKind;
  recipient: string;
  contact_id: number;
  session_id: number;
  status: LinkStatus;
  metadata?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface UpsertChannelLinkInput {
  conversation_id: string;
  channel: ChannelKind;
  recipient?: string;
  contact_id?: number;
  session_id?: number;
  status?: LinkStatus;
  metadata?: Record<string, string>;
}

export const upsertChannelLink = (input: UpsertChannelLinkInput, tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<ChannelLink>(`/api/v1/channel/conversations${qs}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
};

export const listChannelLinks = (conversationId: string, tenantSlug?: string) => {
  const qs = new URLSearchParams({ conversation_id: conversationId });
  if (tenantSlug) qs.set("tenant", tenantSlug);
  return fetchClient<ChannelLink[]>(`/api/v1/channel/conversations?${qs}`);
};

export const disconnectChannelLink = (
  conversationId: string,
  channel: ChannelKind,
  tenantSlug?: string,
) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<ChannelLink>(
    `/api/v1/channel/conversations/${encodeURIComponent(conversationId)}/${encodeURIComponent(channel)}${qs}`,
    { method: "DELETE" },
  );
};

// ── Channel Credentials ──────────────────────────────────────────────────────

export type CredentialStatus = "active" | "inactive" | "revoked";
export type AuthMode = "bearer" | "x-header" | "dual" | "none";

export interface ChannelCredential {
  id: string;
  tenant_id: string;
  channel: ChannelKind;
  integration: string;
  webhook_url: string;
  token: string; // always empty in responses (redacted server-side)
  auth_mode: AuthMode;
  status: CredentialStatus;
  created_at: string;
  updated_at: string;
}

export interface UpsertChannelCredentialInput {
  channel: ChannelKind;
  integration?: string;
  webhook_url: string;
  token?: string;
  auth_mode?: AuthMode;
  status?: CredentialStatus;
}

export const upsertChannelCredential = (
  input: UpsertChannelCredentialInput,
  tenantSlug?: string,
) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<ChannelCredential>(`/api/v1/channel/credentials${qs}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
};

export const activateChannelCredential = (id: string, tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<ChannelCredential>(
    `/api/v1/channel/credentials/${encodeURIComponent(id)}/activate${qs}`,
    { method: "PATCH" },
  );
};

export const deactivateChannelCredential = (id: string, tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<ChannelCredential>(
    `/api/v1/channel/credentials/${encodeURIComponent(id)}/deactivate${qs}`,
    { method: "PATCH" },
  );
};

export const deleteChannelCredential = (id: string, tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<void>(
    `/api/v1/channel/credentials/${encodeURIComponent(id)}${qs}`,
    { method: "DELETE" },
  );
};

// ── WhatsApp Channels (Evolution) ────────────────────────────────────────────

export interface WhatsAppChannel {
  id: string;
  display_name?: string;
  instance_name: string;
  profile_id: string;
  status: string;         // "open" | "connecting" | "close" | "active"
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWhatsAppChannelInput {
  display_name: string;
  profile_id: string;
}

export interface WhatsAppQR {
  code: string;
  base64: string;
}

export interface WhatsAppStatus {
  state: string;         // "open" | "connecting" | "close"
  phone_number?: string;
}

export const createWhatsAppChannel = (input: CreateWhatsAppChannelInput, tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<WhatsAppChannel>(`/api/v1/channels/whatsapp${qs}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
};

export const listWhatsAppChannels = (tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<WhatsAppChannel[]>(`/api/v1/channels/whatsapp${qs}`);
};

export const getWhatsAppQR = (id: string, tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<WhatsAppQR>(`/api/v1/channels/whatsapp/${encodeURIComponent(id)}/qr${qs}`);
};

export const getWhatsAppStatus = (id: string, tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<WhatsAppStatus>(`/api/v1/channels/whatsapp/${encodeURIComponent(id)}/status${qs}`);
};

export const deleteWhatsAppChannel = (id: string, tenantSlug?: string) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";
  return fetchClient<void>(`/api/v1/channels/whatsapp/${encodeURIComponent(id)}${qs}`, {
    method: "DELETE",
  });
};
