import { fetchClient } from './client';
import type {
  CreateWorkflowRequest,
  WorkflowAcceptedResponse,
  WorkflowState,
  WorkflowStatusResponse,
  WorkflowResultResponse,
  AddAgentRequest,
  AddConnectionRequest,
  GenericObject,
} from './types';

export const createWorkflow = (data: CreateWorkflowRequest) =>
  fetchClient<WorkflowAcceptedResponse>('/api/v1/workflows', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getWorkflow = (id: string) =>
  fetchClient<WorkflowState>(`/api/v1/workflows/${id}`, {
    method: 'GET',
  });

export const getWorkflowStatus = (id: string) =>
  fetchClient<WorkflowStatusResponse>(`/api/v1/workflows/${id}/status`, {
    method: 'GET',
  });

export const getWorkflowResult = (id: string) =>
  fetchClient<WorkflowResultResponse>(`/api/v1/workflows/${id}/result`, {
    method: 'GET',
  });

export const addAgentToWorkflow = (id: string, data: AddAgentRequest) =>
  fetchClient<GenericObject>(`/api/v1/workflows/${id}/agents`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const addConnectionToWorkflow = (id: string, data: AddConnectionRequest) =>
  fetchClient<GenericObject>(`/api/v1/workflows/${id}/connections`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Listing — requires the new GET /api/v1/workflows endpoint on the backend
export const listWorkflows = (userId?: string) => {
  const params = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return fetchClient<WorkflowState[]>(`/api/v1/workflows${params}`, {
    method: 'GET',
  });
};
