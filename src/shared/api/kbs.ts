import { fetchClient } from "./client";

export interface KnowledgeBase {
  id: string;
  tenant_id: string;
  kb_id: string;
  name: string;
  description?: string;
  access_scope: string;
  metadata?: unknown;
  created_at: string;
  updated_at: string;
}

export interface KBWriteInput {
  kb_id: string;
  name: string;
  description?: string;
  access_scope?: string;
  metadata?: unknown;
}

export const listKBs = (tenantSlug: string) =>
  fetchClient<KnowledgeBase[]>(`/api/v1/rag/knowledge-bases?tenant=${encodeURIComponent(tenantSlug)}`);

export const createKB = (tenantSlug: string, input: KBWriteInput) =>
  fetchClient<KnowledgeBase>(`/api/v1/rag/knowledge-bases?tenant=${encodeURIComponent(tenantSlug)}`, {
    method: "POST",
    body: JSON.stringify({ ...input, tenant_slug: tenantSlug }),
  });

export const updateKB = (tenantSlug: string, kbID: string, input: Partial<KBWriteInput>) =>
  fetchClient<KnowledgeBase>(
    `/api/v1/rag/knowledge-bases/${encodeURIComponent(kbID)}?tenant=${encodeURIComponent(tenantSlug)}`,
    {
      method: "PUT",
      body: JSON.stringify({ ...input, kb_id: kbID, tenant_slug: tenantSlug }),
    },
  );

export const deleteKB = (tenantSlug: string, kbID: string) =>
  fetchClient<{ status: string }>(
    `/api/v1/rag/knowledge-bases/${encodeURIComponent(kbID)}?tenant=${encodeURIComponent(tenantSlug)}`,
    { method: "DELETE" },
  );
