// Types mapped directly from openapi.yaml

export interface GenericObject {
  [key: string]: any;
}

export interface ErrorResponse {
  error: string;
  code: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

export interface WorkflowAcceptedResponse {
  workflow_id: string;
  status: string;
  created_at: string;
}

export interface AgentSpec {
  id: string;
  type: string;
  config?: GenericObject;
}

export interface PortRef {
  agent_id: string;
  port: string;
}

export interface ConnectionSpec {
  from: PortRef;
  to: PortRef;
}

export interface CreateWorkflowRequest {
  user_id: string;
  agents: AgentSpec[];
  connections?: ConnectionSpec[];
  input?: GenericObject;
}

export interface AddAgentRequest extends AgentSpec {}

export interface AddConnectionRequest extends ConnectionSpec {}

export interface PlanRequest {
  objective: string;
  context?: GenericObject;
}

export interface ConversationTurnRequest {
  profile_id: string;
  conversation_id: string;
  user_id?: string;
  message: string;
  context?: GenericObject;
}

export interface RuleRequest {
  rule: GenericObject;
}

export interface NeedResponseRequest {
  payload: GenericObject;
}

export interface RAGIngestRequest {
  user_id?: string;
  tenant_id: string;
  knowledge_base_id: string;
  document_id: string;
  content: string;
  metadata?: GenericObject;
}

export interface RAGQueryRequest {
  user_id?: string;
  tenant_id: string;
  knowledge_base_ids?: string[];
  access_scope?: string[];
  query: string;
  top_k?: number;
  min_score_threshold?: number;
}
