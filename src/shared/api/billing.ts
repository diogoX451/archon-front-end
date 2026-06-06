import { fetchClient } from "./client";

export interface BillingUsageSummary {
  plan: string;
  plan_expires_at?: string;
  month: string;
  executions: number;
  executions_limit: number;
  llm_tokens: number;
  llm_tokens_limit: number;
  rag_bytes: number;
  rag_bytes_limit: number;
  graph_memory: boolean;
  crm_enabled: boolean;
  cards_enabled: boolean;
}

export interface MeBillingResponse {
  tenant_id: string;
  slug: string;
  name: string;
  usage: BillingUsageSummary;
}

export const getMeBilling = () =>
  fetchClient<MeBillingResponse>("/api/v1/me/billing");
