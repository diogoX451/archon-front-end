import { fetchClient } from './client';
import type { 
  RAGIngestRequest, 
  RAGQueryRequest, 
  WorkflowAcceptedResponse 
} from './types';

export interface RagDashboardResponse {
  tenant_slug: string;
  knowledge_bases_total: number;
  documents_total: number;
  chunks_total: number;
  queries_24h: number;
  ingests_24h: number;
  avg_query_latency_ms_24h: number;
}

export interface RagDocument {
  id: string;
  kb_id: string;
  title: string;
  content_type?: string;
  size_bytes?: number;
  chunks_count?: number;
  status?: string;
  created_at: string;
  updated_at?: string;
}

export interface RagDocumentsResponse {
  items: RagDocument[];
  total: number;
}

export interface RagIngestion {
  workflow_id: string;
  kb_id: string;
  document_id: string;
  status: string;
  chunks_created?: number;
  error?: string;
  created_at: string;
  finished_at?: string;
}

export interface RagIngestionsResponse {
  items: RagIngestion[];
}

export interface RagQueryLog {
  id: string;
  query: string;
  kb_ids?: string[];
  top_k?: number;
  hits?: number;
  latency_ms?: number;
  created_at: string;
}

export interface RagQueriesResponse {
  items: RagQueryLog[];
}

export interface RagCoverageResponse {
  kb_id: string;
  coverage_score: number;
  documents_indexed: number;
  documents_failed: number;
  avg_chunks_per_doc: number;
  updated_at?: string;
}

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
  });

export const createRAGQueryWorkflow = (data: RAGQueryRequest) => 
  fetchClient<WorkflowAcceptedResponse>('/api/v1/rag/query', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getRAGDashboard = (tenantSlug: string) =>
  fetchClient<RagDashboardResponse>(`/api/v1/rag/dashboard?tenant=${encodeURIComponent(tenantSlug)}`);

export const listRAGDocuments = (tenantSlug: string, kbID: string, limit = 50, offset = 0) =>
  fetchClient<RagDocumentsResponse>(
    `/api/v1/rag/knowledge-bases/${encodeURIComponent(kbID)}/documents?tenant=${encodeURIComponent(tenantSlug)}&limit=${limit}&offset=${offset}`
  );

export const listRAGIngestions = (tenantSlug: string, kbID?: string, limit = 50) => {
  const kb = kbID ? `&kb_id=${encodeURIComponent(kbID)}` : '';
  return fetchClient<RagIngestionsResponse>(
    `/api/v1/rag/ingestions?tenant=${encodeURIComponent(tenantSlug)}${kb}&limit=${limit}`
  );
};

export const listRAGQueries = (tenantSlug: string, kbID?: string, limit = 50) => {
  const kb = kbID ? `&kb_id=${encodeURIComponent(kbID)}` : '';
  return fetchClient<RagQueriesResponse>(
    `/api/v1/rag/queries?tenant=${encodeURIComponent(tenantSlug)}${kb}&limit=${limit}`
  );
};

export const getRAGCoverage = (tenantSlug: string, kbID: string) =>
  fetchClient<RagCoverageResponse>(
    `/api/v1/rag/knowledge-bases/${encodeURIComponent(kbID)}/coverage?tenant=${encodeURIComponent(tenantSlug)}`
  );
