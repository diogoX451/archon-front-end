import { useMutation, useQuery } from '@tanstack/react-query';
import * as api from '../api/rag';
import type { RAGIngestRequest, RAGQueryRequest } from '../api/types';

export const useCreateRAGIngestWorkflow = () => {
  return useMutation({
    mutationFn: (data: RAGIngestRequest) => api.createRAGIngestWorkflow(data),
  });
};

export const useCreateRAGIngestUploadWorkflow = () => {
  return useMutation({
    mutationFn: (data: FormData) => api.createRAGIngestUploadWorkflow(data),
  });
};

export const useCreateRAGQueryWorkflow = () => {
  return useMutation({
    mutationFn: (data: RAGQueryRequest) => api.createRAGQueryWorkflow(data),
  });
};

export const useRAGDashboard = (tenantSlug?: string) =>
  useQuery({
    queryKey: ['rag', 'dashboard', tenantSlug],
    queryFn: () => api.getRAGDashboard(tenantSlug!),
    enabled: !!tenantSlug,
  });

export const useRAGDocuments = (
  tenantSlug?: string,
  kbID?: string,
  options?: { enabled?: boolean; refetchInterval?: number | false }
) =>
  useQuery({
    queryKey: ['rag', 'documents', tenantSlug, kbID],
    queryFn: () => api.listRAGDocuments(tenantSlug!, kbID!),
    enabled: (options?.enabled ?? true) && !!tenantSlug && !!kbID,
    refetchInterval: options?.refetchInterval,
  });

export const useRAGIngestions = (tenantSlug?: string, kbID?: string) =>
  useQuery({
    queryKey: ['rag', 'ingestions', tenantSlug, kbID],
    queryFn: () => api.listRAGIngestions(tenantSlug!, kbID),
    enabled: !!tenantSlug,
  });

export const useRAGQueries = (tenantSlug?: string, kbID?: string) =>
  useQuery({
    queryKey: ['rag', 'queries', tenantSlug, kbID],
    queryFn: () => api.listRAGQueries(tenantSlug!, kbID),
    enabled: !!tenantSlug,
  });

export const useRAGCoverage = (tenantSlug?: string, kbID?: string) =>
  useQuery({
    queryKey: ['rag', 'coverage', tenantSlug, kbID],
    queryFn: () => api.getRAGCoverage(tenantSlug!, kbID!),
    enabled: !!tenantSlug && !!kbID,
  });
