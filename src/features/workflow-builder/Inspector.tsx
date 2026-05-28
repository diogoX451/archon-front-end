import React, { useState, useMemo, useEffect, useRef } from "react";
import { AGENT_TYPES } from "./data";
import { AgentNodeData, ConnectionData, WorkflowData } from "./types";
import type { CanvasMeta, GuardrailChecks, GuardrailsConfig } from "./profileSerializer";
import { canvasToProfile, profileToCanvas } from "./profileSerializer";
import { GLYPHS } from "@shared/ui/icons/glyphs";
import { IconSliders, IconTerminal, IconShare, IconTrash, GlyphPlanner } from "@shared/ui/icons/Icons";
import type { ConversationProfileV2 } from "@shared/api/profiles";
import type { GhostAction } from "./GhostActionNode";
import { useKBs } from "@shared/hooks/useKBs";
import { useMCPConfigs } from "@shared/hooks/useMCPConfigs";
import { useMCPTools } from "@shared/hooks/useMCPTools";
import { useAuth } from "@app/auth-context";
import type { MCPConfig } from "@shared/api/mcpConfig";

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return h;
}

type FieldProps = {
  label: string;
  children: React.ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function requiredScopesText(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join("\n");
  if (typeof value === "string") return value;
  return "";
}

function requiredScopesList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function defaultSubjectFromMCP(cfg?: MCPConfig): string {
  const subject = cfg?.metadata?.oauth_subject;
  return typeof subject === "string" ? subject : "";
}

function scopesForTool(cfg: MCPConfig | undefined, tool: string): string[] {
  if (!cfg || !tool) return [];
  const raw = cfg.metadata?.tool_required_scopes || cfg.metadata?.required_scopes;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const scopes = (raw as Record<string, unknown>)[tool];
  return Array.isArray(scopes) ? scopes.map(String).filter(Boolean) : [];
}

type PlannerAction = {
  name: string;
  description?: string;
  agent_type?: string;
  need_type?: string;
  config?: Record<string, any>;
};

const ACTION_KINDS: { id: string; label: string; agent_type?: string; need_type?: string; configFields?: string[] }[] = [
  { id: "complete", label: "complete (responder direto)" },
  { id: "ask_user", label: "ask_user (pedir info)" },
  { id: "http", label: "http (chamar API externa)", agent_type: "http", configFields: ["method", "url", "headers", "timeout"] },
  { id: "rag", label: "rag.query (buscar contexto)", agent_type: "event", need_type: "rag.query" },
  { id: "mcp", label: "mcp (ferramenta MCP)", agent_type: "mcp", need_type: "mcp" },
  { id: "interaction", label: "interaction (canal)", agent_type: "interaction", need_type: "user_interaction.whatsapp.buttons" },
  { id: "event", label: "event (custom)", agent_type: "event" },
];

function detectKind(action: PlannerAction): string {
  if (action.name === "complete") return "complete";
  if (action.name === "ask_user") return "ask_user";
  if (action.agent_type === "http") return "http";
  if (action.need_type === "rag.query") return "rag";
  if (action.agent_type === "mcp") return "mcp";
  if (action.agent_type === "interaction") return "interaction";
  return "event";
}

function applyKind(action: PlannerAction, kind: string): PlannerAction {
  const spec = ACTION_KINDS.find((k) => k.id === kind);
  if (!spec) return action;
  const next: PlannerAction = { ...action };
  if (kind === "complete" || kind === "ask_user") {
    if (!next.name || ["complete", "ask_user"].indexOf(next.name) === -1) next.name = kind;
    delete next.agent_type;
    delete next.need_type;
    delete next.config;
    return next;
  }
  next.agent_type = spec.agent_type;
  if (spec.need_type) next.need_type = spec.need_type;
  if (kind === "http" && !next.config) next.config = { method: "GET", url: "", timeout: 15 };
  if (kind === "rag" && !next.config) next.config = { knowledge_base_ids: [], top_k: 5, min_score: 0.0 };
  if (kind === "mcp") {
    if (!next.config) next.config = { mcp_name: "", tool: "", oauth_subject: "" };
    // Auto-name only when coming from another kind; preserve if already mcp__ prefixed
    if (!next.name.startsWith("mcp__")) next.name = "mcp__tool";
  }
  return next;
}

function MCPActionFields({
  action,
  mcpServers,
  onServerChange,
  onToolChange,
  onSubjectChange,
}: {
  action: PlannerAction;
  mcpServers: MCPConfig[];
  onServerChange: (name: string) => void;
  onToolChange: (tool: string) => void;
  onSubjectChange: (subject: string) => void;
}) {
  const selectedServer = mcpServers.find((s) => s.name === (action.config?.mcp_name as string));
  const subject = (action.config?.oauth_subject as string) || "";
  const { data: tools = [], isLoading: loadingTools } = useMCPTools(
    selectedServer?.id,
    subject || undefined,
    { enabled: !!selectedServer },
  );

  return (
    <>
      <Field label="servidor MCP">
        {mcpServers.length > 0 ? (
          <select
            className="field-select"
            value={(action.config?.mcp_name as string) || ""}
            onChange={(e) => onServerChange(e.target.value)}
          >
            <option value="">{"—"} selecionar {"—"}</option>
            {mcpServers.filter((s) => s.enabled).map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        ) : (
          <input
            className="field-input"
            value={(action.config?.mcp_name as string) || ""}
            onChange={(e) => onServerChange(e.target.value)}
            placeholder="nome-do-servidor"
          />
        )}
      </Field>
      <Field label="tool">
        {selectedServer && tools.length > 0 ? (
          <select
            className="field-select"
            value={(action.config?.tool as string) || ""}
            onChange={(e) => onToolChange(e.target.value)}
          >
            <option value="">{"—"} selecionar tool {"—"}</option>
            {tools.map((t) => (
              <option key={t.name} value={t.name} title={t.description}>{t.name}</option>
            ))}
          </select>
        ) : (
          <input
            className="field-input"
            value={(action.config?.tool as string) || ""}
            onChange={(e) => onToolChange(e.target.value)}
            placeholder={loadingTools ? "Carregando tools…" : "list_events"}
          />
        )}
        {selectedServer && tools.length === 0 && !loadingTools && (
          <div className="field-hint" style={{ color: "var(--warn)" }}>Nenhuma tool encontrada {"—"} servidor pode estar offline.</div>
        )}
      </Field>
      <Field label="oauth_subject (opcional)">
        <input
          className="field-input"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="user@email.com ou deixar vazio"
        />
      </Field>
      <div className="field-hint">name: <code>{action.name}</code></div>
    </>
  );
}

function RagKBSelector({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { activeTenantSlug } = useAuth();
  const { data: kbs, isLoading } = useKBs(activeTenantSlug);
  const toggle = (kbId: string) => {
    if (value.includes(kbId)) onChange(value.filter((id) => id !== kbId));
    else onChange([...value, kbId]);
  };
  if (isLoading) return <div className="field-hint">Carregando bases…</div>;
  if (!kbs || kbs.length === 0) return (
    <div className="field-hint">Nenhuma knowledge base cadastrada. <a href="/rag" target="_blank" rel="noreferrer">Criar em RAG</a>.</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {kbs.map((kb) => (
        <label key={kb.kb_id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={value.includes(kb.kb_id)}
            onChange={() => toggle(kb.kb_id)}
            aria-label={`Base de conhecimento ${kb.name}`}
          />
          <span style={{ fontWeight: 500 }}>{kb.name}</span>
          <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{kb.kb_id}</span>
        </label>
      ))}
      {value.length === 0 && (
        <div className="field-hint" style={{ color: "var(--warn)" }}>Nenhuma base selecionada {"—"} query vai buscar em todas.</div>
      )}
    </div>
  );
}

function PlannerActionsEditor({ actions, onChange, mcpServers = [] }: { actions: PlannerAction[]; onChange: (next: PlannerAction[]) => void; mcpServers?: MCPConfig[] }) {
  const update = (idx: number, patch: Partial<PlannerAction>) => {
    onChange(actions.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };
  const updateConfig = (idx: number, key: string, value: any) => {
    onChange(actions.map((a, i) => (i === idx ? { ...a, config: { ...(a.config || {}), [key]: value } } : a)));
  };
  const updateMCPConfig = (idx: number, key: "mcp_name" | "tool" | "oauth_subject", value: string) => {
    onChange(actions.map((a, i) => {
      if (i !== idx) return a;
      const cfg = { ...(a.config || {}), [key]: value };
      // Auto-sync action name to mcp__<server>__<tool>
      const server = key === "mcp_name" ? value : (cfg.mcp_name as string || "");
      const tool = key === "tool" ? value : (cfg.tool as string || "");
      const name = server && tool ? `mcp__${server}__${tool}` : a.name;
      return { ...a, name, config: cfg };
    }));
  };
  const remove = (idx: number) => onChange(actions.filter((_, i) => i !== idx));
  const add = () => onChange([...actions, { name: "nova_action", description: "" }]);

  return (
    <>
      {actions.length === 0 && <div className="empty-state" style={{ marginBottom: 8 }}>Nenhuma action. Adicione ao menos <code>complete</code>.</div>}
      {actions.map((action, idx) => {
        const kind = detectKind(action);
        const spec = ACTION_KINDS.find((k) => k.id === kind);
        return (
          <div key={idx} className="card" style={{ padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>#{idx + 1}</span>
              <select
                className="field-select"
                style={{ flex: 1 }}
                value={kind}
                onChange={(e) => onChange(actions.map((a, i) => (i === idx ? applyKind(a, e.target.value) : a)))}
                aria-label="Tipo da action"
              >
                {ACTION_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
              <button type="button" className="btn ghost" onClick={() => remove(idx)} title="Remover action" aria-label="Remover action" style={{ padding: "4px 8px" }}>×</button>
            </div>
            <Field label="name">
              <input
                className="field-input"
                value={action.name}
                onChange={(e) => update(idx, { name: e.target.value })}
                disabled={kind === "complete" || kind === "ask_user"}
                aria-label="Nome da action"
              />
            </Field>
            <Field label="description">
              <input
                className="field-input"
                value={action.description || ""}
                onChange={(e) => update(idx, { description: e.target.value })}
                placeholder="O que esta tool faz"
                aria-label="Descrição da action"
              />
            </Field>
            {kind === "event" && (
              <Field label="need_type">
                <input
                  className="field-input"
                  value={action.need_type || ""}
                  onChange={(e) => update(idx, { need_type: e.target.value })}
                  placeholder="my.custom.event"
                  aria-label="Tipo do evento (need_type)"
                />
              </Field>
            )}
            {kind === "http" && (
              <>
                <Field label="method">
                  <select
                    className="field-select"
                    value={(action.config?.method as string) || "GET"}
                    onChange={(e) => updateConfig(idx, "method", e.target.value)}
                    aria-label="Método HTTP"
                  >
                    <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
                  </select>
                </Field>
                <Field label="url">
                  <input
                    className="field-input"
                    value={(action.config?.url as string) || ""}
                    onChange={(e) => updateConfig(idx, "url", e.target.value)}
                    placeholder="https://api…/{param}"
                  />
                </Field>
                <Field label="headers (JSON)">
                  <textarea
                    className="field-textarea"
                    value={typeof action.config?.headers === "string" ? action.config.headers : JSON.stringify(action.config?.headers || {}, null, 2)}
                    onChange={(e) => updateConfig(idx, "headers", e.target.value)}
                    placeholder='{"Accept": "application/json"}'
                  />
                </Field>
                <Field label="timeout (s)">
                  <input
                    className="field-input"
                    type="number"
                    value={(action.config?.timeout as number) || 15}
                    onChange={(e) => updateConfig(idx, "timeout", +e.target.value)}
                  />
                </Field>
              </>
            )}
            {kind === "rag" && (
              <>
                <Field label="knowledge bases">
                  <RagKBSelector
                    value={Array.isArray(action.config?.knowledge_base_ids) ? action.config.knowledge_base_ids : []}
                    onChange={(ids) => updateConfig(idx, "knowledge_base_ids", ids)}
                  />
                </Field>
                <Field label="top_k">
                  <input
                    className="field-input"
                    type="number"
                    min={1}
                    max={50}
                    value={(action.config?.top_k as number) || 5}
                    onChange={(e) => updateConfig(idx, "top_k", +e.target.value)}
                  />
                </Field>
                <Field label="min_score">
                  <input
                    className="field-input"
                    type="number"
                    step="0.05"
                    min={0}
                    max={1}
                    value={(action.config?.min_score as number) ?? 0.0}
                    onChange={(e) => updateConfig(idx, "min_score", +e.target.value)}
                  />
                </Field>
              </>
            )}
            {kind === "mcp" && (
              <MCPActionFields
                action={action}
                mcpServers={mcpServers}
                onServerChange={(v) => updateMCPConfig(idx, "mcp_name", v)}
                onToolChange={(v) => updateMCPConfig(idx, "tool", v)}
                onSubjectChange={(v) => updateMCPConfig(idx, "oauth_subject", v)}
              />
            )}
            {kind === "interaction" && (
              <Field label="need_type">
                <input
                  className="field-input"
                  value={action.need_type || ""}
                  onChange={(e) => update(idx, { need_type: e.target.value })}
                  placeholder="user_interaction.whatsapp.buttons"
                />
              </Field>
            )}
            {spec && spec.need_type && kind !== "event" && kind !== "interaction" && kind !== "mcp" && (
              <div className="field-hint" style={{ marginTop: -4 }}>
                need_type: <code>{spec.need_type}</code>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" className="btn" onClick={add} style={{ width: "100%", marginTop: 4 }}>+ Adicionar action</button>
      <div className="field-hint" style={{ marginTop: 8 }}>
        Actions definem o que o planner pode escolher. <code>response_schema</code> é derivado automaticamente ao salvar.
      </div>
    </>
  );
}

function MemoryHooksEditor({ rules, onChange }: { rules: Array<{ relations: string[]; edge_type: string }>; onChange: (next: Array<{ relations: string[]; edge_type: string }>) => void }) {
  const update = (idx: number, patch: Partial<{ relations: string[]; edge_type: string }>) => {
    onChange(rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const remove = (idx: number) => onChange(rules.filter((_, i) => i !== idx));
  const add = () => onChange([...rules, { relations: [], edge_type: "" }]);

  return (
    <>
      {rules.length === 0 && (
        <div className="empty-state" style={{ marginBottom: 8 }}>
          Nenhuma regra. Hook rules mapeiam relações extraídas pelo planner para arestas Neo4j.
        </div>
      )}
      {rules.map((rule, idx) => (
        <div key={idx} className="card" style={{ padding: 10, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>regra #{idx + 1}</span>
            <button type="button" className="btn ghost" onClick={() => remove(idx)} style={{ padding: "2px 8px" }}>×</button>
          </div>
          <Field label="relations (separadas por vírgula)">
            <input
              className="field-input"
              value={rule.relations.join(", ")}
              onChange={(e) => update(idx, { relations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="WORKS_ON, TRABALHA_EM"
            />
          </Field>
          <Field label="edge_type">
            <input
              className="field-input"
              value={rule.edge_type}
              onChange={(e) => update(idx, { edge_type: e.target.value })}
              placeholder="WORKS_ON"
            />
          </Field>
        </div>
      ))}
      <button type="button" className="btn" onClick={add} style={{ width: "100%" }}>+ Nova regra</button>
    </>
  );
}

type ToolResultMapping = { action: string; relation: string; target_field: string; kind: string };

function ToolResultMappingsEditor({ mappings, onChange }: { mappings: ToolResultMapping[]; onChange: (next: ToolResultMapping[]) => void }) {
  const update = (idx: number, patch: Partial<ToolResultMapping>) =>
    onChange(mappings.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  const remove = (idx: number) => onChange(mappings.filter((_, i) => i !== idx));
  const add = () => onChange([...mappings, { action: "", relation: "", target_field: "", kind: "ENTITY" }]);

  return (
    <>
      {mappings.length === 0 && (
        <div className="empty-state" style={{ marginBottom: 8 }}>
          Nenhum mapeamento. Mapeia resultados de tools MCP para relações de memória (ex: create_event → AGENDOU).
        </div>
      )}
      {mappings.map((m, idx) => (
        <div key={idx} className="card" style={{ padding: 10, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>mapeamento #{idx + 1}</span>
            <button type="button" className="btn ghost" onClick={() => remove(idx)} style={{ padding: "2px 8px" }}>×</button>
          </div>
          <Field label="action (nome da tool MCP)">
            <input className="field-input" value={m.action} onChange={(e) => update(idx, { action: e.target.value })} placeholder="create_event" />
          </Field>
          <Field label="relation (relação emitida)">
            <input className="field-input" value={m.relation} onChange={(e) => update(idx, { relation: e.target.value })} placeholder="AGENDOU" />
          </Field>
          <Field label="target_field (campo JSON, vazio = texto raw)">
            <input className="field-input" value={m.target_field} onChange={(e) => update(idx, { target_field: e.target.value })} placeholder="summary" />
          </Field>
          <Field label="kind (tipo de entidade)">
            <input className="field-input" value={m.kind} onChange={(e) => update(idx, { kind: e.target.value })} placeholder="EVENTO" />
          </Field>
        </div>
      ))}
      <button type="button" className="btn" onClick={add} style={{ width: "100%" }}>+ Novo mapeamento</button>
    </>
  );
}

const GUARDRAIL_CHECKS: { key: keyof GuardrailChecks & string; label: string }[] = [
  { key: "pii", label: "PII" },
  { key: "jailbreak", label: "Jailbreak" },
  { key: "hallucination", label: "Alucinação" },
  { key: "nsfw", label: "NSFW" },
  { key: "moderation", label: "Moderação" },
  { key: "prompt_injection", label: "Prompt injection" },
];

function GuardrailsEditor({ value, onChange }: { value?: GuardrailsConfig; onChange: (next: GuardrailsConfig | undefined) => void }) {
  if (!value) {
    return (
      <button
        type="button"
        className="btn ghost"
        style={{ width: "100%", fontSize: 12, marginBottom: 8 }}
        onClick={() => onChange({ enabled: true, blocking_mode: "warn", checks: {} })}
      >
        + Ativar guardrails neste workflow
      </button>
    );
  }
  const cfg: GuardrailsConfig = value;
  const set = <K extends keyof GuardrailsConfig>(k: K, v: GuardrailsConfig[K]) => onChange({ ...cfg, [k]: v });
  const setCheck = (key: keyof GuardrailChecks & string, v: boolean) => set("checks", { ...cfg.checks, [key]: v });

  const toolsExemptText = (cfg.tools_exempt || []).join(", ");

  return (
    <div style={{ marginBottom: 12 }}>
      <Field label="ativo">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={cfg.enabled !== false}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          {cfg.enabled !== false ? "habilitado" : "desabilitado"}
        </label>
      </Field>
      <Field label="blocking_mode">
        <select
          className="field-select"
          value={cfg.blocking_mode || "warn"}
          onChange={(e) => set("blocking_mode", e.target.value as GuardrailsConfig["blocking_mode"])}
        >
          <option value="warn">warn (registra, não bloqueia)</option>
          <option value="block">block (bloqueia execução)</option>
          <option value="retry">retry (tenta novamente)</option>
          <option value="escalate">escalate (exige aprovação)</option>
        </select>
      </Field>
      <Field label="max_retries">
        <input
          className="field-input"
          type="number"
          min={0}
          max={10}
          value={cfg.max_retries ?? 2}
          onChange={(e) => set("max_retries", +e.target.value)}
        />
      </Field>
      <Field label="checks">
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
          {GUARDRAIL_CHECKS.map(({ key, label }) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!(cfg.checks as any)?.[key]}
                onChange={(e) => setCheck(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </Field>
      <Field label="min_composite">
        <input
          className="field-input"
          type="number"
          step="0.05"
          min={0}
          max={1}
          value={cfg.min_composite ?? 0.6}
          onChange={(e) => set("min_composite", +e.target.value)}
        />
        <div className="field-hint">Score mínimo composto [0–1]. Padrão: 0.60.</div>
      </Field>
      <Field label="financial_threshold">
        <input
          className="field-input"
          type="number"
          min={0}
          value={cfg.financial_threshold ?? 1000}
          onChange={(e) => set("financial_threshold", +e.target.value)}
        />
        <div className="field-hint">Bloqueia tool calls com amount/value acima deste valor.</div>
      </Field>
      <Field label="tools_exempt (vírgula)">
        <input
          className="field-input"
          value={toolsExemptText}
          onChange={(e) =>
            set("tools_exempt", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
          }
          placeholder="list_events, get_calendar"
        />
        <div className="field-hint">Tools isentas de verificação de score.</div>
      </Field>
      <button
        type="button"
        className="btn ghost"
        style={{ marginTop: 4, fontSize: 12, width: "100%" }}
        onClick={() => onChange(undefined)}
      >
        remover guardrails
      </button>
    </div>
  );
}

function WorkflowInspector({
  workflow,
  meta,
  onMetaChange,
}: {
  workflow: WorkflowData;
  meta?: CanvasMeta;
  onMetaChange?: (patch: Partial<CanvasMeta>) => void;
}) {
  const { isSuper } = useAuth();
  const counts = workflow.agents.reduce((acc: any, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {});

  const id = meta?.id || "—";
  const hookRules = meta?.memory_hook_rules || [];
  const toolResultMappings = meta?.memory_tool_result_mappings || [];

  return (
    <>
      <div className="section-title">Profile</div>
      {isSuper && (
        <Field label="tenant_slug">
          <input
            className="field-input"
            value={meta?.tenant_slug || ""}
            onChange={(e) => onMetaChange?.({ tenant_slug: e.target.value || undefined })}
            placeholder="slug-do-tenant (vazio = seu tenant)"
          />
          <div className="field-hint">Super admin: deixe vazio para usar seu tenant ou informe o slug do tenant alvo.</div>
        </Field>
      )}
      <Field label="ID do profile">
        <input
          className="field-input"
          value={meta?.id || ""}
          onChange={(e) => onMetaChange?.({ id: e.target.value })}
          placeholder="meu-agente"
        />
        <div className="field-hint">Slug único. Caracteres permitidos: a-z, 0-9, _ e -.</div>
      </Field>
      <Field label="Descrição">
        <textarea
          className="field-textarea"
          value={meta?.description || ""}
          onChange={(e) => onMetaChange?.({ description: e.target.value })}
          placeholder="Para que serve este agente"
        />
      </Field>
      <Field label="executor_type">
        <select
          className="field-select"
          value={meta?.executor_type || "conversation"}
          onChange={(e) => onMetaChange?.({ executor_type: e.target.value })}
        >
          <option value="conversation">conversation</option>
          <option value="agenda">agenda</option>
          <option value="task">task</option>
        </select>
        <div className="field-hint">Determina qual MemorySignalExtractor é usado após o workflow.</div>
      </Field>
      <Field label="user_id_prefix">
        <input
          className="field-input"
          value={meta?.user_id_prefix || ""}
          onChange={(e) => onMetaChange?.({ user_id_prefix: e.target.value })}
          placeholder="conversation:"
        />
      </Field>

      <div className="section-title">Estatísticas</div>
      <div className="kv-list">
        <div className="kv-row"><span className="k">id</span><span className="v mono">{id}</span></div>
        <div className="kv-row"><span className="k">agentes</span><span className="v">{workflow.agents.length}</span></div>
        <div className="kv-row"><span className="k">conexões</span><span className="v">{workflow.connections.length}</span></div>
      </div>

      <div className="section-title">Composição</div>
      <div className="kv-list">
        {Object.entries(counts).length === 0 && <div className="kv-row"><span className="k">{"—"}</span><span className="v">vazio</span></div>}
        {Object.entries(counts).map(([type, n]) => (
          <div key={type} className="kv-row">
            <span className="k">{type}</span>
            <span className="v">×{n as number}</span>
          </div>
        ))}
      </div>

      <div className="section-title">Memory hooks</div>
      <MemoryHooksEditor
        rules={hookRules}
        onChange={(next) => onMetaChange?.({ memory_hook_rules: next })}
      />

      <div className="section-title">Tool → Memória</div>
      <ToolResultMappingsEditor
        mappings={toolResultMappings}
        onChange={(next) => onMetaChange?.({ memory_tool_result_mappings: next })}
      />

      <div className="section-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Guardrails
        {meta?.guardrails?.enabled !== false && meta?.guardrails && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "oklch(0.55 0.12 72)", background: "oklch(0.96 0.03 72)", border: "1px solid oklch(0.85 0.06 72)", borderRadius: 4, padding: "1px 7px" }}>
            ativo
          </span>
        )}
      </div>
      <GuardrailsEditor
        value={meta?.guardrails}
        onChange={(next) => onMetaChange?.({ guardrails: next })}
      />

      <div className="section-title">Atalhos</div>
      <div className="kv-list">
        <div className="kv-row"><span className="k">Space</span><span className="v">mover canvas</span></div>
        <div className="kv-row"><span className="k">⌫</span><span className="v">excluir seleção</span></div>
        <div className="kv-row"><span className="k">ctrl+scroll</span><span className="v">zoom</span></div>
      </div>
    </>
  );
}

function AgentInspector({ agent, onUpdate, onRemove }: { agent: AgentNodeData, onUpdate: (patch: any) => void, onRemove: () => void }) {
  const meta = AGENT_TYPES[agent.type];
  const Glyph = (GLYPHS as any)[meta.glyph] || GlyphPlanner;
  const setConfig = (k: string, v: any) => onUpdate({ config: { ...agent.config, [k]: v } });

  // MCP registry lookup — only hits the API when this agent actually
  // depends on it. Super-admins without a selected tenant get an empty
  // list and fall back to the free-text input.
  const { activeTenantSlug, isSuper } = useAuth();
  const mcpTenant = isSuper ? undefined : activeTenantSlug || undefined;
  const { data: mcpServers = [], isLoading: loadingMCPs, isError: mcpErr } = useMCPConfigs(
    mcpTenant,
    { enabled: agent.type === "mcp" || agent.type === "planner" },
  );
  const selectedMCP = mcpServers.find((s) => s.name === agent.config.mcp_name);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 7, display: "grid", placeItems: "center" }}>
          <Glyph size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500 }}>{meta.label}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>{agent.id}</div>
        </div>
        <button type="button" className="btn ghost" onClick={onRemove} title="Excluir agente"><IconTrash className="icon-sm" /></button>
      </div>

      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.55 }}>
        {meta.description}
      </div>

      <div className="section-title">Identificação</div>
      <Field label="ID do agente">
        <input className="field-input" value={agent.id} readOnly />
        <div className="field-hint">Para renomear, dê duplo clique no nome no canvas.</div>
      </Field>
      <Field label="Tipo">
        <input className="field-input" value={agent.type} readOnly />
      </Field>

      <div className="section-title">Configuração</div>
      {agent.type === "http" && (
        <>
          <Field label="Método">
            <select className="field-select" value={agent.config.method || "GET"} onChange={(e) => setConfig("method", e.target.value)}>
              <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
            </select>
          </Field>
          <Field label="URL">
            <input className="field-input" value={agent.config.url || ""} onChange={(e) => setConfig("url", e.target.value)} placeholder="https://api…" />
          </Field>
          <Field label="Headers (JSON)">
            <textarea className="field-textarea" value={agent.config.headers || ""} onChange={(e) => setConfig("headers", e.target.value)} placeholder='{"Authorization": "Bearer …"}' />
          </Field>
        </>
      )}
      {agent.type === "planner" && (
        <>
          <Field label="Modo">
            <select className="field-select" value={agent.config.mode || "external"} onChange={(e) => setConfig("mode", e.target.value)}>
              <option value="external">external (LLM)</option>
              <option value="static">static (mock)</option>
            </select>
            {(agent.config.mode || "external") === "static" && (
              <div className="field-hint">Retorna action fixa sem chamar LLM {"—"} útil para testar o fluxo sem consumir créditos.</div>
            )}
          </Field>
          <Field label="Provider">
            <select
              className="field-select"
              value={agent.config.provider || "openai"}
              onChange={(e) => onUpdate({ config: { ...agent.config, provider: e.target.value, model: "" } })}
            >
              <option value="openai">openai</option>
              <option value="anthropic">anthropic</option>
              <option value="google">google</option>
              <option value="ollama">ollama</option>
            </select>
            <div className="field-hint">
              Chaves de API configuradas em{" "}
              <a href="/llm-config" target="_blank" rel="noreferrer">Config de LLM →</a>
            </div>
          </Field>
          <Field label="Model">
            <input
              className="field-input"
              value={agent.config.model || ""}
              onChange={(e) => setConfig("model", e.target.value)}
              placeholder={
                (agent.config.provider || "openai") === "anthropic" ? "ex: claude-3-5-sonnet-20241022" :
                (agent.config.provider) === "google" ? "ex: gemini-1.5-pro" :
                (agent.config.provider) === "ollama" ? "ex: llama3.2" :
                "ex: gpt-4o"
              }
            />
            {!agent.config.model && (
              <div className="field-hint" style={{ color: "var(--warn)" }}>Modelo não definido {"—"} planner não vai funcionar em runtime.</div>
            )}
          </Field>
          <Field label="Instruções">
            <textarea
              className="field-textarea"
              value={agent.config.instructions || ""}
              onChange={(e) => setConfig("instructions", e.target.value)}
              placeholder="Você é um assistente que… (system prompt enviado ao LLM a cada chamada)"
            />
          </Field>

          <details style={{ marginTop: 4, marginBottom: 12 }}>
            <summary className="field-label" style={{ cursor: "pointer", userSelect: "none" }}>Avançado</summary>
            <div style={{ marginTop: 8 }}>
              <Field label="need_type">
                <input className="field-input" value={agent.config.need_type || "planner"} onChange={(e) => setConfig("need_type", e.target.value)} placeholder="planner" />
                <div className="field-hint">Subject NATS do executor LLM. Padrão: <code>planner</code>.</div>
              </Field>
            </div>
          </details>

          <div className="section-title">Actions (ferramentas)</div>
          <PlannerActionsEditor
            actions={Array.isArray(agent.config.actions) ? agent.config.actions : []}
            onChange={(next) => setConfig("actions", next)}
            mcpServers={mcpServers}
          />
        </>
      )}
      {agent.type === "transform" && (
        <Field label="Script">
          <textarea className="field-textarea" style={{ minHeight: 110 }} value={agent.config.script || ""} onChange={(e) => setConfig("script", e.target.value)} />
          <div className="field-hint">Recebe <code style={{ fontFamily: "var(--font-mono)" }}>input</code>, retorna o objeto resultante.</div>
        </Field>
      )}
      {agent.type === "rag-query" && (
        <>
          <Field label="Knowledge base"><input className="field-input" value={agent.config.knowledge_base_id || ""} onChange={(e) => setConfig("knowledge_base_id", e.target.value)} /></Field>
          <Field label="top_k"><input className="field-input" type="number" value={agent.config.top_k || 5} onChange={(e) => setConfig("top_k", +e.target.value)} /></Field>
          <Field label="min_score"><input className="field-input" type="number" step="0.1" value={agent.config.min_score || 0.5} onChange={(e) => setConfig("min_score", +e.target.value)} /></Field>
        </>
      )}
      {agent.type === "event" && (
        <Field label="need_type"><input className="field-input" value={agent.config.need_type || ""} onChange={(e) => setConfig("need_type", e.target.value)} placeholder="my.custom.event" /></Field>
      )}
      {agent.type === "interaction" && (
        <>
          <Field label="Canal">
            <select className="field-select" value={agent.config.channel || "whatsapp"} onChange={(e) => setConfig("channel", e.target.value)}>
              <option>whatsapp</option><option>telegram</option><option>slack</option>
            </select>
          </Field>
          <Field label="Template"><input className="field-input" value={agent.config.template || ""} onChange={(e) => setConfig("template", e.target.value)} /></Field>
        </>
      )}
      {agent.type === "conversation" && (
        <Field label="profile_id"><input className="field-input" value={agent.config.profile_id || ""} onChange={(e) => setConfig("profile_id", e.target.value)} /></Field>
      )}
      {agent.type === "router" && (
        <Field label="Condição"><textarea className="field-textarea" value={agent.config.condition || ""} onChange={(e) => setConfig("condition", e.target.value)} placeholder="input.score > 0.7 ? 'path_a' : 'path_b'" /></Field>
      )}
      {agent.type === "calculator" && (
        <Field label="Expressão"><input className="field-input" value={agent.config.expression || ""} onChange={(e) => setConfig("expression", e.target.value)} placeholder="input.a + input.b" /></Field>
      )}
      {agent.type === "rag-ingestion" && (
        <>
          <Field label="tenant_id"><input className="field-input" value={agent.config.tenant_id || ""} onChange={(e) => setConfig("tenant_id", e.target.value)} /></Field>
          <Field label="knowledge_base_id"><input className="field-input" value={agent.config.knowledge_base_id || ""} onChange={(e) => setConfig("knowledge_base_id", e.target.value)} /></Field>
        </>
      )}
      {agent.type === "mcp" && (
        <>
          <Field label="MCP server">
            {loadingMCPs ? (
              <input className="field-input" disabled value="Carregando registry…" />
            ) : mcpErr || mcpServers.length === 0 ? (
              // Either the API failed or the tenant has no MCPs yet. Fall
              // back to a free-text input so the workflow author can still
              // wire a name they plan to register later, then point them
              // at the admin page.
              <>
                <input
                  className="field-input"
                  value={agent.config.mcp_name || ""}
                  onChange={(e) => setConfig("mcp_name", e.target.value)}
                  placeholder="ex: erp"
                />
                <div className="field-hint">
                  Nenhum MCP cadastrado para este tenant.{" "}
                  <a href="/mcp-config" target="_blank" rel="noreferrer">
                    Cadastrar →
                  </a>
                </div>
              </>
            ) : (
              <>
                <select
                  className="field-select"
                  value={agent.config.mcp_name || ""}
                  onChange={(e) => {
                    const name = e.target.value;
                    const cfg = mcpServers.find((s) => s.name === name);
                    onUpdate({
                      config: {
                        ...agent.config,
                        mcp_name: name,
                        oauth_subject: agent.config.oauth_subject || defaultSubjectFromMCP(cfg),
                      },
                    });
                  }}
                >
                  <option value="">Selecione um servidor…</option>
                  {mcpServers.map((s) => (
                    <option
                      key={s.name}
                      value={s.name}
                      disabled={!s.enabled}
                    >
                      {s.name} ({s.transport}){s.enabled ? "" : " · desativado"}
                    </option>
                  ))}
                </select>
                <div className="field-hint">
                  Resolvido pelo registry em runtime {"—"} URL e token não
                  precisam ser duplicados aqui.
                </div>
              </>
            )}
          </Field>
          <Field label="Tool">
            <input
              className="field-input"
              value={agent.config.tool || ""}
              onChange={(e) => {
                const tool = e.target.value;
                const scopes = scopesForTool(selectedMCP, tool);
                onUpdate({
                  config: {
                    ...agent.config,
                    tool,
                    required_scopes: scopes.length > 0 ? scopes : agent.config.required_scopes,
                  },
                });
              }}
              placeholder="ex: list_orders"
            />
            <div className="field-hint">
              Nome da tool exposta pelo MCP server selecionado.
            </div>
          </Field>
          <Field label="OAuth subject">
            <input
              className="field-input"
              value={agent.config.oauth_subject || ""}
              onChange={(e) => setConfig("oauth_subject", e.target.value)}
              placeholder="ex: suporte@empresa.com ou _service"
            />
            <div className="field-hint">
              Necessario para MCP OAuth com multiplas contas. Se vazio, o backend usa metadata.oauth_subject ou exige selecao quando houver conflito.
            </div>
            {selectedMCP?.auth?.mode?.startsWith("oauth2") && agent.config.oauth_subject && (
              <div className="field-hint" style={{ color: "var(--color-warning, #b45309)", marginTop: 4 }}>
                Se a conta precisar reconectar (token expirado ou revogado), acesse{" "}
                <a href={`/admin/mcp?highlight=${selectedMCP.id}`} style={{ textDecoration: "underline" }}>
                  MCP Config →
                </a>
              </div>
            )}
          </Field>
          <Field label="Required scopes">
            <textarea
              className="field-textarea"
              value={requiredScopesText(agent.config.required_scopes)}
              onChange={(e) => setConfig("required_scopes", requiredScopesList(e.target.value))}
              placeholder="https://www.googleapis.com/auth/gmail.send"
            />
            <div className="field-hint">
              Um por linha ou separado por virgula. O executor valida esses scopes antes da tool call.
            </div>
          </Field>
        </>
      )}
      {agent.type === "guardrails" && (
        <>
          <Field label="blocking_mode">
            <select
              className="field-select"
              value={agent.config.blocking_mode || "block"}
              onChange={(e) => setConfig("blocking_mode", e.target.value)}
            >
              <option value="block">block — interrompe fluxo</option>
              <option value="warn">warn — registra, continua</option>
              <option value="retry">retry — tenta novamente</option>
              <option value="escalate">escalate — aguarda aprovação</option>
            </select>
          </Field>
          <Field label="checks">
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
              {GUARDRAIL_CHECKS.map(({ key, label }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!(agent.config.checks as any)?.[key]}
                    onChange={(e) => setConfig("checks", { ...(agent.config.checks || {}), [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </Field>
          <Field label="min_composite">
            <input
              className="field-input"
              type="number"
              step="0.05"
              min={0}
              max={1}
              value={agent.config.min_composite ?? 0.6}
              onChange={(e) => setConfig("min_composite", +e.target.value)}
            />
            <div className="field-hint">Score mínimo composto [0–1]. Padrão: 0.60.</div>
          </Field>
          <Field label="financial_threshold">
            <input
              className="field-input"
              type="number"
              min={0}
              value={agent.config.financial_threshold ?? 1000}
              onChange={(e) => setConfig("financial_threshold", +e.target.value)}
            />
          </Field>
          <Field label="tools_exempt (vírgula)">
            <input
              className="field-input"
              value={(agent.config.tools_exempt || []).join(", ")}
              onChange={(e) =>
                setConfig("tools_exempt", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))
              }
              placeholder="list_events, get_calendar"
            />
          </Field>
        </>
      )}
      <div className="section-title">Portas</div>
      <div className="kv-list">
        {meta.ports.principal.map((p: string) => (
          <div key={p} className="kv-row"><span className="k">principal</span><span className="v">{p}</span></div>
        ))}
        {meta.ports.auxiliary.map((p: string) => (
          <div key={p} className="kv-row"><span className="k">auxiliar</span><span className="v">{p}</span></div>
        ))}
      </div>

      {meta.needType && (
        <>
          <div className="section-title">Subject NATS</div>
          <div className="kv-list">
            <div className="kv-row"><span className="k">need</span><span className="v">archon.need.{meta.needType}</span></div>
            <div className="kv-row"><span className="k">response</span><span className="v">archon.response.{`{corr_id}`}</span></div>
          </div>
        </>
      )}
    </>
  );
}

function ConnectionInspector({ conn, workflow, onRemove }: { conn: ConnectionData, workflow: WorkflowData, onRemove: () => void }) {
  const fromAgent = workflow.agents.find((a) => a.id === conn.from.agent);
  const toAgent = workflow.agents.find((a) => a.id === conn.to.agent);
  
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 500 }}>Conexão</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>{conn.id}</div>
        </div>
        <button type="button" className="btn ghost" onClick={onRemove}><IconTrash className="icon-sm" /></button>
      </div>

      <div className="kv-list">
        <div className="kv-row"><span className="k">from</span><span className="v">{conn.from.agent}.{conn.from.port}</span></div>
        <div className="kv-row"><span className="k">to</span><span className="v">{conn.to.agent}.{conn.to.port}</span></div>
      </div>

      <div className="section-title">Regra de Interação</div>
      <div className="kv-list">
        <div className="kv-row">
          <span className="k">par</span>
          <span className="v">{fromAgent?.type} ↔ {toAgent?.type}</span>
        </div>
        <div className="kv-row">
          <span className="k">tipo</span>
          <span className="v">aux → principal</span>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 14, lineHeight: 1.55 }}>
        Quando <code style={{ fontFamily: "var(--font-mono)" }}>{conn.from.agent}.{conn.from.port}</code> emite um valor, o worker aplica a regra
        e dispara <code style={{ fontFamily: "var(--font-mono)" }}>{conn.to.agent}</code> com esse valor em <code style={{ fontFamily: "var(--font-mono)" }}>{conn.to.port}</code>.
      </div>
    </>
  );
}

function JsonTab({
  workflow,
  meta,
  onReplaceWorkflow,
}: {
  workflow: WorkflowData;
  meta?: CanvasMeta;
  onReplaceWorkflow?: (w: WorkflowData, m: CanvasMeta) => void;
}) {
  const canonical = useMemo(
    () => JSON.stringify(canvasToProfile(workflow, meta || { id: "" }), null, 2),
    [workflow, meta],
  );
  const [draft, setDraft] = useState(canonical);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const justApplied = useRef(false);

  useEffect(() => {
    if (justApplied.current) {
      justApplied.current = false;
      return;
    }
    setDraft(canonical);
    setError(null);
    setApplied(false);
  }, [canonical]);

  const apply = () => {
    try {
      const parsed = JSON.parse(draft);
      const { workflow: w, meta: m } = profileToCanvas(parsed as ConversationProfileV2);
      justApplied.current = true;
      onReplaceWorkflow?.(w, m);
      setError(null);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    } catch (e: any) {
      setError(e?.message || "JSON inválido");
    }
  };

  const isDirty = draft !== canonical;

  return (
    <>
      <div className="section-title">JSON do profile</div>
      <textarea
        className="field-textarea"
        style={{ minHeight: 420, fontFamily: "var(--font-mono)", fontSize: 12, resize: "vertical" }}
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setError(null); setApplied(false); }}
        spellCheck={false}
      />
      {error && (
        <div style={{ color: "var(--error, #dc2626)", fontSize: 12, marginTop: 4, fontFamily: "var(--font-mono)" }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          type="button"
          className="btn"
          onClick={apply}
          disabled={!isDirty}
          style={{ flex: 1 }}
        >
          {applied ? "Aplicado ✓" : "Aplicar"}
        </button>
        {isDirty && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => { setDraft(canonical); setError(null); }}
          >
            Resetar
          </button>
        )}
      </div>
      <div className="field-hint" style={{ marginTop: 6 }}>
        Edite o JSON e clique em Aplicar para atualizar o canvas. Salve após aplicar para persistir.
      </div>
    </>
  );
}

function RulesTab({ workflow }: { workflow: WorkflowData }) {
  const rules = useMemo(() => {
    const seen = new Map();
    for (const c of workflow.connections) {
      const a = workflow.agents.find((x) => x.id === c.from.agent);
      const b = workflow.agents.find((x) => x.id === c.to.agent);
      if (!a || !b) continue;
      const key = `${a.type}::${b.type}`;
      if (!seen.has(key)) seen.set(key, { a: a.type, b: b.type, n: 0 });
      seen.get(key).n += 1;
    }
    return Array.from(seen.values());
  }, [workflow]);

  return (
    <>
      <div className="section-title">Regras Aplicadas</div>
      {rules.length === 0 && <div className="empty-state">Nenhuma conexão definida ainda.</div>}
      {rules.map((r: any) => (
        <div key={`${r.a}-${r.b}`} className="kv-list" style={{ marginBottom: 8 }}>
          <div className="kv-row" style={{ alignItems: "center" }}>
            <span className="k" style={{ minWidth: 0, flex: 1, color: "var(--ink-2)" }}>
              <span style={{ fontFamily: "var(--font-mono)" }}>{r.a}</span>
              <span style={{ color: "var(--ink-4)", margin: "0 6px" }}>↔</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{r.b}</span>
            </span>
            <span className="v" style={{ flexShrink: 0, color: "var(--ink-3)" }}>×{r.n}</span>
          </div>
        </div>
      ))}

      <div className="section-title">Invariantes</div>
      <div className="kv-list">
        <div className="kv-row"><span className="k">max_depth</span><span className="v">12</span></div>
        <div className="kv-row"><span className="k">cycles</span><span className="v">allowed</span></div>
      </div>
    </>
  );
}


type InspectorProps = {
  tab: string;
  setTab: (tab: string) => void;
  selectedAgent: AgentNodeData | null;
  selectedConn: ConnectionData | null;
  selectedGhost?: GhostAction | null;
  workflow: WorkflowData;
  meta?: CanvasMeta;
  onMetaChange?: (patch: Partial<CanvasMeta>) => void;
  onUpdateAgent: (id: string, patch: any) => void;
  onRemoveAgent: (id: string) => void;
  onRemoveConnection: (id: string) => void;
  onReplaceWorkflow?: (w: WorkflowData, m: CanvasMeta) => void;
};

function GhostActionInspector({ ghost }: { ghost: GhostAction }) {
  const isTerminal = !ghost.agentType && !ghost.needType;
  return (
    <div className="form-stack">
      <div className="section-title">Action do planner</div>
      <Field label="Planner">
        <div className="mono" style={{ fontSize: 12 }}>{ghost.plannerId}</div>
      </Field>
      <Field label="Nome">
        <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{ghost.name}</div>
      </Field>
      {ghost.description && (
        <Field label="Descrição">
          <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{ghost.description}</div>
        </Field>
      )}
      <Field label="Tipo">
        {isTerminal ? (
          <span className="pill">terminal · responde direto ao usuário</span>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="pill">fan-out</span>
            {ghost.agentType && <span className="pill" data-tone="muted">→ {ghost.agentType}</span>}
            {ghost.needType && (
              <span className="pill" data-tone="warn" style={{ fontFamily: "var(--font-mono)" }}>
                need: {ghost.needType}
              </span>
            )}
          </div>
        )}
      </Field>
      <div className="field-hint" style={{ marginTop: 4 }}>
        Esta é uma branch dinâmica {"—"} o planner LLM decide em runtime. Para editar
        as actions, selecione o nó do planner.
      </div>
    </div>
  );
}

export function Inspector({ tab, setTab, selectedAgent, selectedConn, selectedGhost, workflow, meta, onMetaChange, onUpdateAgent, onRemoveAgent, onRemoveConnection, onReplaceWorkflow }: InspectorProps) {
  return (
    <aside className="inspector" data-tour="builder-inspector">
      <div className="inspector-tabs">
        <button type="button" className="inspector-tab" data-active={tab === "config"} onClick={() => setTab("config")}>
          <IconSliders className="icon-sm" /> Inspetor
        </button>
        <button type="button" className="inspector-tab" data-active={tab === "json"} onClick={() => setTab("json")}>
          <IconTerminal className="icon-sm" /> JSON
        </button>
        <button type="button" className="inspector-tab" data-active={tab === "rules"} onClick={() => setTab("rules")}>
          <IconShare className="icon-sm" /> Regras
          <span className="badge">{workflow.connections.length}</span>
        </button>
      </div>
      <div className="inspector-body">
        {tab === "config" && (
          selectedGhost ? <GhostActionInspector ghost={selectedGhost} /> :
          selectedAgent ? <AgentInspector agent={selectedAgent} onUpdate={(patch) => onUpdateAgent(selectedAgent.id, patch)} onRemove={() => onRemoveAgent(selectedAgent.id)} /> :
          selectedConn ? <ConnectionInspector conn={selectedConn} workflow={workflow} onRemove={() => onRemoveConnection(selectedConn.id)} /> :
          <WorkflowInspector workflow={workflow} meta={meta} onMetaChange={onMetaChange} />
        )}
        {tab === "json" && <JsonTab workflow={workflow} meta={meta} onReplaceWorkflow={onReplaceWorkflow} />}
        {tab === "rules" && <RulesTab workflow={workflow} />}
      </div>
    </aside>
  );
}
