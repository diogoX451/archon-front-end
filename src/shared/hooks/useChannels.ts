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
