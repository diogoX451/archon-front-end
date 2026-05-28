import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateChannelCredential,
  deactivateChannelCredential,
  deleteChannelCredential,
  disconnectChannelLink,
  listChannelLinks,
  upsertChannelCredential,
  upsertChannelLink,
  type UpsertChannelCredentialInput,
  type UpsertChannelLinkInput,
} from "@shared/api/channels";

const LINKS_KEY = "channel_links";
const CREDS_KEY = "channel_credentials";

export const useChannelLinks = (conversationId: string, tenantSlug?: string) =>
  useQuery({
    queryKey: [LINKS_KEY, tenantSlug || "_all", conversationId],
    queryFn: () => listChannelLinks(conversationId, tenantSlug),
    enabled: !!conversationId,
  });

export const useUpsertChannelLink = (tenantSlug?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertChannelLinkInput) => upsertChannelLink(input, tenantSlug),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [LINKS_KEY, tenantSlug || "_all", vars.conversation_id] });
    },
  });
};

export const useDisconnectChannelLink = (tenantSlug?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, channel }: { conversationId: string; channel: string }) =>
      disconnectChannelLink(conversationId, channel, tenantSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LINKS_KEY] });
    },
  });
};

export const useUpsertChannelCredential = (tenantSlug?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertChannelCredentialInput) =>
      upsertChannelCredential(input, tenantSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CREDS_KEY] });
    },
  });
};

export const useActivateChannelCredential = (tenantSlug?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateChannelCredential(id, tenantSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CREDS_KEY] });
    },
  });
};

export const useDeactivateChannelCredential = (tenantSlug?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateChannelCredential(id, tenantSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CREDS_KEY] });
    },
  });
};

export const useDeleteChannelCredential = (tenantSlug?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteChannelCredential(id, tenantSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CREDS_KEY] });
    },
  });
};

// ── WhatsApp Channels ────────────────────────────────────────────────────────

import {
  createWhatsAppChannel,
  listWhatsAppChannels,
  getWhatsAppQR,
  getWhatsAppStatus,
  deleteWhatsAppChannel,
  type CreateWhatsAppChannelInput,
} from "@shared/api/channels";

const WA_KEY = "whatsapp_channels";

export const useListWhatsAppChannels = (tenantSlug?: string) =>
  useQuery({
    queryKey: [WA_KEY, tenantSlug || "_all"],
    queryFn: () => listWhatsAppChannels(tenantSlug),
    staleTime: 0,
    refetchInterval: 15_000,
  });

export const useWhatsAppQR = (id: string, tenantSlug?: string, enabled = true) =>
  useQuery({
    queryKey: [WA_KEY, "qr", id, tenantSlug || "_all"],
    queryFn: () => getWhatsAppQR(id, tenantSlug),
    enabled: enabled && !!id,
    refetchInterval: 8_000,
    staleTime: 0,
  });

export const useWhatsAppStatus = (id: string, tenantSlug?: string, enabled = true) =>
  useQuery({
    queryKey: [WA_KEY, "status", id, tenantSlug || "_all"],
    queryFn: () => getWhatsAppStatus(id, tenantSlug),
    enabled: enabled && !!id,
    refetchInterval: 5_000,
    staleTime: 0,
  });

export const useCreateWhatsAppChannel = (tenantSlug?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWhatsAppChannelInput) =>
      createWhatsAppChannel(input, tenantSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WA_KEY] });
    },
  });
};

export const useDeleteWhatsAppChannel = (tenantSlug?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWhatsAppChannel(id, tenantSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WA_KEY] });
    },
  });
};
