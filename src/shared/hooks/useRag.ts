import { useMutation } from '@tanstack/react-query';
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
