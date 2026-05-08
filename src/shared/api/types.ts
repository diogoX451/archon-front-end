// Types mapped from backend DTOs (internal/api/dto)

export interface GenericObject {
  [key: string]: any;
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

// --- Workflow Types ---

export interface WorkflowAcceptedResponse {
  workflow_id: string;
  status: string;
  created_at: string;
}

export interface WorkflowStatusResponse {
  workflow_id: string;
  status: string; // pending | running | waiting | completed | failed
  updated_at: string;
  requeue?: WorkflowRequeueStatus;
}

export interface WorkflowRequeueStatus {
  count: number;
  last_at?: string;
  last_correlation_id?: string;
  last_need_type?: string;
  last_error?: string;
  last_error_at?: string;
}

export interface WorkflowResultResponse {
  workflow_id: string;
  status: string;
  output?: any;
  error?: string;
  finished_at?: string;
}

export interface AgentSpec {
  id: string;
  type: string;
  config?: GenericObject;
}

export interface ConnectionSpec {
  from: string;
  to: string;
  as?: string;
}

export interface CreateWorkflowRequest {
  user_id: string;
  agents: AgentSpec[];
  connections?: ConnectionSpec[];
  input?: GenericObject;
}

export interface AddAgentRequest {
  id: string;
  type: string;
  config?: GenericObject;
}

export interface AddConnectionRequest {
  from: PortRef;
  to: PortRef;
}

export interface PortRef {
  agent_id: string;
  port: string;
}

// --- Conversation Types ---

export interface ConversationTurnRequest {
  profile_id: string;
  conversation_id: string;
  tenant_id?: string;
  user_id?: string;
  message: string;
  history?: any;
  facts?: any;
  context?: GenericObject;
  pending_state?: any;
  metadata?: GenericObject;
  input?: GenericObject;
}

export interface ConversationTurnResponse {
  workflow_id: string;
  status: string;
  profile_id: string;
  conversation_id: string;
  created_at: string;
}

export interface ConversationProfile {
  id: string;
  name?: string;
  description?: string;
  user_id?: string;
  user_id_prefix?: string;
  metadata?: GenericObject;
  [key: string]: any;
}

// --- RAG Types ---

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

// --- Rule Types (not used in front-end currently) ---

export interface RuleRequest {
  rule: GenericObject;
}

export interface NeedResponseRequest {
  payload: GenericObject;
}

// --- Workflow State (from stateStore) ---

export interface WorkflowState {
  id: string;
  user_id: string;
  tenant_id?: string;
  status: string;
  agents?: Record<string, AgentSnapshot>;
  waiting?: any[];
  created_at?: string;
  updated_at?: string;
}

export interface AgentSnapshot {
  id: string;
  type: string;
  state: string;
  input?: any;
  output?: any;
  need?: any;
  updated_at?: string;
}
