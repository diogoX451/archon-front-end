import { useQuery, useMutation } from '@tanstack/react-query';
import * as api from '../api/conversation';
import type { ConversationTurnRequest, ConversationProfile, ConversationTurnResponse } from '../api/types';

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
    mutationFn: (data: ConversationTurnRequest) =>
      api.createConversationTurn(data) as Promise<ConversationTurnResponse>,
  });
};
