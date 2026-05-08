import { fetchClient } from './client';
import type { ConversationTurnRequest, GenericObject } from './types';

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
