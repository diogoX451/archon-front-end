import { fetchClient } from './client';
import type {
  ConversationAudioUploadRequest,
  ConversationAudioUploadResponse,
  ConversationTurnRequest,
  GenericObject,
} from './types';

export const listConversationProfiles = () => 
  fetchClient<GenericObject>('/api/v1/conversation/profiles', {
    method: 'GET',
  });

export const getConversationProfile = (id: string) => 
  fetchClient<GenericObject>(`/api/v1/conversation/profiles/${id}`, {
    method: 'GET',
  });

export const createConversationTurn = (data: ConversationTurnRequest) => 
  fetchClient<GenericObject>('/api/v1/conversation/turns', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const uploadConversationAudio = (
  conversationId: string,
  data: ConversationAudioUploadRequest,
  tenantSlug?: string,
) => {
  const qs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : '';
  return fetchClient<ConversationAudioUploadResponse>(
    `/api/v1/conversations/${encodeURIComponent(conversationId)}/audio${qs}`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
};
