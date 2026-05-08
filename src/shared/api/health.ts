import { fetchClient } from './client';
import type { HealthResponse } from './types';

export const getHealth = () => 
  fetchClient<HealthResponse>('/health', {
    method: 'GET',
  });
