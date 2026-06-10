import type { ProfileWriteInput, ConversationProfileV2 } from "@shared/api/profiles";
import { AGENT_TYPES } from "./data";
import type { AgentNodeData, ConnectionData, WorkflowData } from "./types";

/**
 * Maps between the visual workflow canvas (positions, drag-drop nodes) and the
 * backend ConversationProfile JSON contract. Positions live in metadata.ui so
 * the canvas can round-trip without polluting the executor payload.
 */

type UiConnection = {
  id: string;
  from: { agent: string; port: string };
  to: { agent: string; port: string };
};

type UiMetadata = {
  positions?: Record<string, { x: number; y: number }>;
  /** User-overridden ghost positions keyed by "<plannerId>::<actionName>".
   *  Falls back to auto-layout when entry is missing. */
  ghost_positions?: Record<string, { x: number; y: number }>;
  name?: string;
  connections?: UiConnection[];
};

type AgentJSON = {
  id: string;
  type: string;
  config?: Record<string, any>;
};

type ConnectionJSON = {
  id?: string;
  from: { agent: string; port: string };
  to: { agent: string; port: string };
};

export type GuardrailChecks = {
  pii?: boolean;
  jailbreak?: boolean;
  hallucination?: boolean;
  nsfw?: boolean;
  moderation?: boolean;
  prompt_injection?: boolean;
};

export type GuardrailsConfig = {
  enabled?: boolean;
  blocking_mode?: "block" | "retry" | "warn" | "escalate";
  max_retries?: number;
  checks?: GuardrailChecks;
  min_composite?: number;
  min_rag_relevance?: number;
  min_graph_certainty?: number;
  min_sql_similarity?: number;
  financial_threshold?: number;
  tools_exempt?: string[];
};

export type CanvasMeta = {
  id: string;
  description?: string;
  user_id_prefix?: string;
  user_id?: string;
  tenant_slug?: string;
  executor_type?: string;
  memory_hook_rules?: Array<{ relations: string[]; edge_type: string }>;
  memory_tool_result_mappings?: Array<{ action: string; relation: string; target_field: string; kind: string }>;
  input_defaults?: any;
  extra_metadata?: any;
  guardrails?: GuardrailsConfig;
  /** User-overridden ghost-node positions. Survives reload via
   *  metadata.ui.ghost_positions. */
  ghost_positions?: Record<string, { x: number; y: number }>;
  /** When set, the conversation-turn-executor calls ProcessMission on every
   *  turn and injects state/action/hint into the planner context as
   *  reactive_context. Built-in value: "archon.sales". */
  reactive_mission_id?: string;
};

type PlannerAction = {
  name: string;
  description?: string;
  agent_type?: string;
  need_type?: string;
  config?: Record<string, any>;
};

/**
 * Derive a JSON schema for the planner LLM response based on the declared
 * actions. Each action becomes an enum entry for the `action` field; the
 * orchestrator validates planner output against this schema.
 */
function deriveResponseSchema(actions: PlannerAction[]): Record<string, any> {
  const names = actions.map((a) => a.name).filter(Boolean);
  return {
    type: "object",
    anyOf: [{ required: ["action"] }, { required: ["actions"] }],
    properties: {
      action: { type: "string", enum: names },
      actions: {
        type: "array",
        items: {
          type: "object",
          required: ["action"],
          properties: {
            action: { type: "string", enum: names.filter((n) => n !== "complete" && n !== "ask_user") },
            input: { type: "object" },
            reason: { type: "string" },
          },
        },
      },
      input: {
        type: "object",
        properties: { text: { type: "string" } },
      },
      reason: { type: "string" },
    },
  };
}

function hasCustomResponseSchema(schema: unknown): boolean {
  if (!schema || typeof schema !== "object") return false;
  const keys = Object.keys(schema as Record<string, unknown>);
  return keys.length > 0;
}

/**
 * Sanitize planner config: parse headers JSON strings, normalize each
 * action's shape, and derive a default response_schema only when the
 * profile doesn't already ship one. Profiles authored by hand (e.g.
 * docs/profiles/archon-assistant.json) carry richer schemas with
 * per-action input shapes — we must not flatten those back to the
 * generic auto-derived form, or planner validation breaks.
 */
function sanitizePlannerConfig(config: Record<string, any>): Record<string, any> {
  const out = { ...config };
  const rawActions = Array.isArray(out.actions) ? out.actions : [];
  const actions: PlannerAction[] = rawActions.map((a: any) => {
    const next: PlannerAction = {
      name: a?.name || "",
      description: a?.description,
      agent_type: a?.agent_type,
      need_type: a?.need_type,
    };
    if (a?.config && typeof a.config === "object") {
      const cfg: Record<string, any> = { ...a.config };
      if (typeof cfg.headers === "string") {
        const trimmed = cfg.headers.trim();
        if (trimmed === "") {
          delete cfg.headers;
        } else {
          try {
            cfg.headers = JSON.parse(trimmed);
          } catch {
            // keep string; backend may reject — surface as-is
          }
        }
      }
      next.config = cfg;
    }
    return next;
  });
  out.actions = actions;
  if (actions.length > 0 && !hasCustomResponseSchema(out.response_schema)) {
    out.response_schema = deriveResponseSchema(actions);
  }
  return out;
}

export function canvasToProfile(workflow: WorkflowData, meta: CanvasMeta): ProfileWriteInput {
  const positions: Record<string, { x: number; y: number }> = {};
  for (const a of workflow.agents) {
    positions[a.id] = { x: a.x, y: a.y };
  }

  const agents: AgentJSON[] = workflow.agents.map((a) => {
    let config = a.config && Object.keys(a.config).length > 0 ? { ...a.config } : undefined;
    if (a.type === "planner" && config) {
      config = sanitizePlannerConfig(config);
    }
    return { id: a.id, type: a.type, config };
  });

  // Backend ConnectionDef expects {from: string, to: string} (agent IDs).
  // We keep the rich canvas representation (with port + id) in metadata.ui so
  // round-tripping doesn't lose port information, and emit minimal string
  // pairs for the executor.
  const connections = workflow.connections.map((c) => ({
    from: c.from.agent,
    to: c.to.agent,
  }));
  const uiConnections = workflow.connections.map((c) => ({
    id: c.id,
    from: { agent: c.from.agent, port: c.from.port },
    to: { agent: c.to.agent, port: c.to.port },
  }));

  const uiMetadata: UiMetadata = {
    positions,
    name: workflow.name,
    connections: uiConnections.length > 0 ? uiConnections : undefined,
    ghost_positions: meta.ghost_positions && Object.keys(meta.ghost_positions).length > 0
      ? meta.ghost_positions
      : undefined,
  };
  const metadata: Record<string, any> = {
    ...(meta.extra_metadata && typeof meta.extra_metadata === "object" ? meta.extra_metadata : {}),
    ui: uiMetadata,
    ...(meta.guardrails ? { guardrails: meta.guardrails } : {}),
    ...(meta.reactive_mission_id ? { reactive_mission_id: meta.reactive_mission_id } : {}),
  };

  return {
    id: meta.id,
    tenant_slug: meta.tenant_slug,
    description: meta.description,
    user_id_prefix: meta.user_id_prefix,
    user_id: meta.user_id,
    executor_type: meta.executor_type,
    memory_schema:
      (meta.memory_hook_rules && meta.memory_hook_rules.length > 0) ||
      (meta.memory_tool_result_mappings && meta.memory_tool_result_mappings.length > 0)
        ? {
            ...(meta.memory_hook_rules && meta.memory_hook_rules.length > 0 ? { hook_rules: meta.memory_hook_rules } : {}),
            ...(meta.memory_tool_result_mappings && meta.memory_tool_result_mappings.length > 0 ? { tool_result_mappings: meta.memory_tool_result_mappings } : {}),
          }
        : undefined,
    agents,
    connections: connections.length > 0 ? connections : undefined,
    input_defaults: meta.input_defaults,
    metadata,
  };
}

export function profileToCanvas(profile: ConversationProfileV2): { workflow: WorkflowData; meta: CanvasMeta } {
  const rawAgents = (profile.agents as AgentJSON[] | undefined) || [];
  const metadata: any = profile.metadata || {};
  const ui: UiMetadata = (metadata.ui as UiMetadata) || {};
  const positions = ui.positions || {};

  // Prefer rich UI connections (with ports) if previously round-tripped;
  // otherwise fall back to the executor's string-form connections, defaulting
  // each agent's primary port pair.
  const uiConns = ui.connections || [];
  const rawTopLevel = (profile.connections as any[] | undefined) || [];
  const rawConnections: ConnectionJSON[] = uiConns.length > 0
    ? uiConns.map((c) => ({ id: c.id, from: c.from, to: c.to }))
    : rawTopLevel.map((c: any, idx: number) => {
        if (typeof c?.from === "object" && c.from?.agent) {
          return { id: c.id || `c_${idx}`, from: c.from, to: c.to };
        }
        const fromAgent = typeof c?.from === "string" ? c.from : "";
        const toAgent = typeof c?.to === "string" ? c.to : "";
        return {
          id: c?.id || `c_${idx}`,
          from: { agent: fromAgent, port: "output" },
          to: { agent: toAgent, port: "input" },
        };
      });

  const agents: AgentNodeData[] = rawAgents.map((a, idx) => {
    const pos = positions[a.id];
    const fallbackX = 120 + (idx % 4) * 280;
    const fallbackY = 140 + Math.floor(idx / 4) * 200;
    const knownType = AGENT_TYPES[a.type];
    const defaultConfig = knownType ? knownType.defaultConfig : {};
    return {
      id: a.id,
      type: a.type,
      x: pos?.x ?? fallbackX,
      y: pos?.y ?? fallbackY,
      status: "idle",
      config: { ...defaultConfig, ...(a.config || {}) },
    };
  });

  const connections: ConnectionData[] = rawConnections.map((c, idx) => ({
    id: c.id || `c_${idx}`,
    from: { agent: c.from.agent, port: c.from.port },
    to: { agent: c.to.agent, port: c.to.port },
    status: "idle",
  }));

  // First-class executor_type / memory_schema (post-migration 0003) win;
  // fall back to metadata stash for legacy rows that haven't been re-saved.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ui: _omitUi, executor_type: legacyExecutor, memory_schema: legacyMemory, guardrails: guardrailsMeta, reactive_mission_id: reactiveMissionId, ...extraMetadata } = metadata;
  const executorType = profile.executor_type || (typeof legacyExecutor === "string" ? legacyExecutor : undefined);
  const memorySchema: any = profile.memory_schema || legacyMemory;
  const memoryHookRules = Array.isArray(memorySchema?.hook_rules) ? memorySchema.hook_rules : undefined;
  const memoryToolResultMappings = Array.isArray(memorySchema?.tool_result_mappings) ? memorySchema.tool_result_mappings : undefined;

  return {
    workflow: {
      name: ui.name || profile.profile_id || profile.id,
      agents,
      connections,
    },
    meta: {
      id: profile.profile_id || profile.id,
      description: profile.description,
      user_id_prefix: profile.user_id_prefix,
      user_id: profile.user_id,
      tenant_slug: undefined,
      executor_type: executorType,
      memory_hook_rules: memoryHookRules,
      memory_tool_result_mappings: memoryToolResultMappings,
      input_defaults: profile.input_defaults,
      extra_metadata: Object.keys(extraMetadata).length > 0 ? extraMetadata : undefined,
      guardrails: guardrailsMeta && typeof guardrailsMeta === "object" ? guardrailsMeta : undefined,
      ghost_positions: ui.ghost_positions,
      reactive_mission_id: typeof reactiveMissionId === "string" && reactiveMissionId ? reactiveMissionId : undefined,
    },
  };
}

export function emptyCanvas(name = "Novo agente"): WorkflowData {
  return { name, agents: [], connections: [] };
}
