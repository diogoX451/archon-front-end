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

export const conversationKeys = {
  profiles: ['profiles'] as const,
  profile: (id: string) => [...conversationKeys.profiles, id] as const,
};

export const useListConversationProfiles = () => {
  return useQuery({
    queryKey: conversationKeys.profiles,
    queryFn: () => api.listConversationProfiles() as Promise<ConversationProfile[]>,
  });
};

export const useGetConversationProfile = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: conversationKeys.profile(id),
    queryFn: () => api.getConversationProfile(id) as Promise<ConversationProfile>,
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
    mutationFn: (args: { conversationId: string; data: ConversationAudioUploadRequest }) => {
      const tenant = (getActiveTenantSlug() || "").trim();
      return api.uploadConversationAudio(args.conversationId, args.data, tenant) as Promise<ConversationAudioUploadResponse>;
    },
  });
};
