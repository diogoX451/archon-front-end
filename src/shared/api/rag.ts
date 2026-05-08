import { fetchClient } from './client';
import type { 
  RAGIngestRequest, 
  RAGQueryRequest, 
  WorkflowAcceptedResponse 
} from './types';

export const createRAGIngestWorkflow = (data: RAGIngestRequest) => 
  fetchClient<WorkflowAcceptedResponse>('/api/v1/rag/ingest', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Para suportar upload de arquivos (multipart/form-data)
export const createRAGIngestUploadWorkflow = (formData: FormData) => 
  fetchClient<WorkflowAcceptedResponse>('/api/v1/rag/ingest', {
    method: 'POST',
    body: formData,
    // O fetchClient não define Content-Type explicitamente para instâncias de FormData, 
    // permitindo que o browser adicione o boundary adequado na requisição.
  });

export const createRAGQueryWorkflow = (data: RAGQueryRequest) => 
  fetchClient<WorkflowAcceptedResponse>('/api/v1/rag/query', {
    method: 'POST',
    body: JSON.stringify(data),
  });
