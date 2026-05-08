import React, { useState, useMemo } from "react";
import { AGENT_TYPES, SAMPLE_WORKFLOW } from "./data";
import { AgentNodeData, ConnectionData, WorkflowData } from "./types";
import { IconSliders, IconTerminal, IconShare, IconTrash, GLYPHS, GlyphPlanner } from "@shared/ui/icons/Icons";

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

function WorkflowInspector({ workflow }: { workflow: WorkflowData }) {
  const counts = workflow.agents.reduce((acc: any, a) => { 
    acc[a.type] = (acc[a.type] || 0) + 1; 
    return acc; 
  }, {});
  
  return (
    <>
      <div className="section-title">Workflow</div>
      <div className="kv-list">
        <div className="kv-row"><span className="k">id</span><span className="v">wf_{Math.abs(hashString(workflow.name)).toString(36).slice(0, 8)}</span></div>
        <div className="kv-row"><span className="k">user_id</span><span className="v">user_123</span></div>
        <div className="kv-row"><span className="k">tenant_id</span><span className="v">acme_corp</span></div>
        <div className="kv-row"><span className="k">agentes</span><span className="v">{workflow.agents.length}</span></div>
        <div className="kv-row"><span className="k">conexões</span><span className="v">{workflow.connections.length}</span></div>
      </div>

      <div className="section-title">Composição</div>
      <div className="kv-list">
        {Object.entries(counts).length === 0 && <div className="kv-row"><span className="k">—</span><span className="v">vazio</span></div>}
        {Object.entries(counts).map(([type, n]) => (
          <div key={type} className="kv-row">
            <span className="k">{type}</span>
            <span className="v">×{n as number}</span>
          </div>
        ))}
      </div>

      <div className="section-title">Atalhos</div>
      <div className="kv-list">
        <div className="kv-row"><span className="k">⌘ ↵</span><span className="v">executar workflow</span></div>
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
        <button className="btn ghost" onClick={onRemove} title="Excluir agente"><IconTrash className="icon-sm" /></button>
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
          </Field>
          <Field label="Provider">
            <select className="field-select" value={agent.config.provider || "openai"} onChange={(e) => setConfig("provider", e.target.value)}>
              <option>openai</option><option>anthropic</option><option>ollama</option>
            </select>
          </Field>
          <Field label="Model">
            <input className="field-input" value={agent.config.model || ""} onChange={(e) => setConfig("model", e.target.value)} />
          </Field>
          <Field label="Instruções">
            <textarea className="field-textarea" value={agent.config.instructions || ""} onChange={(e) => setConfig("instructions", e.target.value)} placeholder="Você é um assistente que…" />
          </Field>
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
        <button className="btn ghost" onClick={onRemove}><IconTrash className="icon-sm" /></button>
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

function InputTab({ workflow }: { workflow: WorkflowData }) {
  const [body, setBody] = useState(JSON.stringify(SAMPLE_WORKFLOW.input, null, 2));
  return (
    <>
      <div className="section-title">Entrada do workflow</div>
      <Field label="JSON">
        <textarea className="field-textarea" style={{ minHeight: 140 }} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="field-hint">Esta carga é enviada ao agente raiz quando o workflow é executado.</div>
      </Field>

      <div className="section-title">cURL</div>
      <div className="kv-list" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
        <div style={{ color: "var(--ink-2)" }}>POST /api/v1/workflows</div>
        <div style={{ color: "var(--ink-3)" }}>Content-Type: application/json</div>
        <div style={{ color: "var(--ink-4)" }}>—</div>
        <div style={{ color: "var(--ink-2)" }}>{`{ "user_id": "user_123",`}</div>
        <div style={{ color: "var(--ink-2)", paddingLeft: 14 }}>{`"agents": […${workflow.agents.length}],`}</div>
        <div style={{ color: "var(--ink-2)", paddingLeft: 14 }}>{`"connections": […${workflow.connections.length}],`}</div>
        <div style={{ color: "var(--ink-2)", paddingLeft: 14 }}>{`"input": {…} }`}</div>
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
  workflow: WorkflowData;
  onUpdateAgent: (id: string, patch: any) => void;
  onRemoveAgent: (id: string) => void;
  onRemoveConnection: (id: string) => void;
};

export function Inspector({ tab, setTab, selectedAgent, selectedConn, workflow, onUpdateAgent, onRemoveAgent, onRemoveConnection }: InspectorProps) {
  return (
    <aside className="inspector">
      <div className="inspector-tabs">
        <button className="inspector-tab" data-active={tab === "config"} onClick={() => setTab("config")}>
          <IconSliders className="icon-sm" /> Inspetor
        </button>
        <button className="inspector-tab" data-active={tab === "input"} onClick={() => setTab("input")}>
          <IconTerminal className="icon-sm" /> Entrada
        </button>
        <button className="inspector-tab" data-active={tab === "rules"} onClick={() => setTab("rules")}>
          <IconShare className="icon-sm" /> Regras
          <span className="badge">{workflow.connections.length}</span>
        </button>
      </div>
      <div className="inspector-body">
        {tab === "config" && (
          selectedAgent ? <AgentInspector agent={selectedAgent} onUpdate={(patch) => onUpdateAgent(selectedAgent.id, patch)} onRemove={() => onRemoveAgent(selectedAgent.id)} /> :
          selectedConn ? <ConnectionInspector conn={selectedConn} workflow={workflow} onRemove={() => onRemoveConnection(selectedConn.id)} /> :
          <WorkflowInspector workflow={workflow} />
        )}
        {tab === "input" && <InputTab workflow={workflow} />}
        {tab === "rules" && <RulesTab workflow={workflow} />}
      </div>
    </aside>
  );
}
