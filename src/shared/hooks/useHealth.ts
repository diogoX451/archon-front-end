import { useQuery } from '@tanstack/react-query';
import * as api from '../api/health';

export const useHealthKeys = {
  status: ['health'] as const,
};

export const useGetHealth = (options?: { refetchInterval?: number | false }) => {
  return useQuery({
    queryKey: useHealthKeys.status,
    queryFn: () => api.getHealth(),
    refetchInterval: options?.refetchInterval,
  });
};
