import { useQuery, useMutation } from '@tanstack/react-query';
import * as api from '../api/conversation';
import type {
  ConversationAudioUploadRequest,
  ConversationAudioUploadResponse,
  ConversationTurnRequest,
  ConversationProfile,
  ConversationTurnResponse,
} from '../api/types';
import { getActiveTenantSlug } from "../api/token";
import { resolveConversationTenantSlug } from "../lib/conversationTenant";

export const conversationKeys = {
  profiles: ['profiles'] as const,
  profile: (id: string) => [...conversationKeys.profiles, id] as const,
};

export const useListConversationProfiles = (tenantSlug?: string) => {
  return useQuery({
    queryKey: [...conversationKeys.profiles, tenantSlug || "all"],
    queryFn: () => api.listConversationProfiles(tenantSlug) as Promise<ConversationProfile[]>,
  });
};

export const useGetConversationProfile = (id: string, tenantSlug?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...conversationKeys.profile(id), tenantSlug || "all"],
    queryFn: () => api.getConversationProfile(id, tenantSlug) as Promise<ConversationProfile>,
    enabled: options?.enabled,
  });
};

export const useCreateConversationTurn = () => {
  return useMutation({
    mutationFn: (data: ConversationTurnRequest) => {
      const tenant = (data.tenant_id || getActiveTenantSlug() || "").trim();
      const payload: ConversationTurnRequest = tenant ? { ...data, tenant_id: tenant } : data;
      return api.createConversationTurn(payload) as Promise<ConversationTurnResponse>;
    },
  });
};

export const useUploadConversationAudio = () => {
  return useMutation({
    mutationFn: (args: { conversationId: string; data: ConversationAudioUploadRequest; tenantSlug?: string }) => {
      const tenant = resolveConversationTenantSlug(args.tenantSlug, getActiveTenantSlug());
      return api.uploadConversationAudio(args.conversationId, args.data, tenant) as Promise<ConversationAudioUploadResponse>;
    },
  });
};
