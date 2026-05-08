import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/workflows';
import type { CreateWorkflowRequest, AddAgentRequest, AddConnectionRequest } from '../api/types';

export const workflowKeys = {
  all: ['workflows'] as const,
  list: (userId?: string) => [...workflowKeys.all, 'list', userId] as const,
  detail: (id: string) => [...workflowKeys.all, id] as const,
  status: (id: string) => [...workflowKeys.detail(id), 'status'] as const,
  result: (id: string) => [...workflowKeys.detail(id), 'result'] as const,
};

export const useListWorkflows = (userId?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: workflowKeys.list(userId),
    queryFn: () => api.listWorkflows(userId),
    enabled: options?.enabled,
  });
};

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkflowRequest) => api.createWorkflow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all });
    },
  });
};

export const useGetWorkflow = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: () => api.getWorkflow(id),
    enabled: options?.enabled,
  });
};

export const useGetWorkflowStatus = (id: string, options?: { enabled?: boolean; refetchInterval?: number | false }) => {
  return useQuery({
    queryKey: workflowKeys.status(id),
    queryFn: () => api.getWorkflowStatus(id),
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
  });
};

export const useGetWorkflowResult = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: workflowKeys.result(id),
    queryFn: () => api.getWorkflowResult(id),
    enabled: options?.enabled,
  });
};

export const useAddAgentToWorkflow = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddAgentRequest) => api.addAgentToWorkflow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
};

export const useAddConnectionToWorkflow = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddConnectionRequest) => api.addConnectionToWorkflow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
};
