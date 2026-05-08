import React, { useState } from "react";
import { IconPlus, GLYPHS, GlyphPlanner } from "@shared/ui/icons/Icons";
import { AGENT_TYPES } from "@features/workflow-builder/data";

const IN_USE: Record<string, number> = { 
  planner: 14, http: 22, transform: 18, event: 6, interaction: 7, 
  router: 4, calculator: 2, "rag-query": 11, "rag-ingestion": 5, conversation: 9 
};

const EXECUTORS = [
  ["http-executor", "http", "10/10", "archon.need.http", 0, "82ms", "ok", "online"],
  ["planner-executor", "planner", "5/5", "archon.need.planner.*", 2, "640ms", "ok", "online"],
  ["rag-query-executor", "rag-query", "5/5", "archon.need.rag.query", 0, "120ms", "ok", "online"],
  ["rag-ingestion-executor", "rag-ingestion", "3/3", "archon.need.rag.ingest", 12, "2.4s", "warn", "lag"],
  ["conversation-turn-executor", "conversation", "3/3", "archon.need.conversation.turn", 0, "310ms", "ok", "online"],
  ["channel-delivery-executor", "interaction", "5/5", "archon.need.interaction", 0, "95ms", "ok", "online"],
  ["graph-memory-executor", "graph", "2/2", "archon.need.graph.*", 0, "180ms", "ok", "online"],
];

export function TemplatesPage() {
  const [tab, setTab] = useState("builtin");

  return (
    <>
      <div className="page-topbar">
        <span className="page-title">Agentes</span>
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">Catálogo e tipos disponíveis</span>
        <div style={{ flex: 1 }}></div>
        <button className="btn primary">
          <IconPlus size={14} />
          Novo agente custom
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Catálogo de Agentes</h1>
        <p className="page-lead">
          Tipos disponíveis para compor workflows. Cada agente declara portas <strong style={{ color: "var(--ink)" }}>principais</strong> (entrada) e <strong style={{ color: "var(--ink)" }}>auxiliares</strong> (saídas) e expõe um subject NATS quando precisa de execução externa.
        </p>

        <div className="stat-grid">
          <div className="stat"><div className="label">Tipos built-in</div><div className="value">10</div></div>
          <div className="stat"><div className="label">Custom registrados</div><div className="value">3</div></div>
          <div className="stat"><div className="label">Em uso (workflows)</div><div className="value">28</div><div className="delta">+4 esta semana</div></div>
          <div className="stat"><div className="label">Executores online</div><div className="value">7 / 7</div><div className="delta">100% saudáveis</div></div>
        </div>

        <div className="page-tabs">
          <button className="page-tab" data-active={tab === "builtin"} onClick={() => setTab("builtin")}>
            Built-in <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", marginLeft: 4 }}>10</span>
          </button>
          <button className="page-tab" data-active={tab === "custom"} onClick={() => setTab("custom")}>
            Custom <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", marginLeft: 4 }}>3</span>
          </button>
          <button className="page-tab" data-active={tab === "executors"} onClick={() => setTab("executors")}>
            Executores
          </button>
        </div>

        <div className="toolbar">
          <input className="search-input" placeholder="Buscar agente…" />
          <select className="field-select" style={{ width: "auto" }}>
            <option>Todas as categorias</option><option>Decisão</option><option>I/O Externo</option><option>Dados</option><option>RAG</option><option>Canais</option>
          </select>
          <div className="grow"></div>
          <span style={{ color: "var(--ink-3)", fontSize: 12 }}>10 resultados</span>
        </div>

        <div className="card-grid">
          {Object.entries(AGENT_TYPES).map(([type, meta]) => {
            const Glyph = (GLYPHS as any)[meta.glyph] || GlyphPlanner;
            const uses = IN_USE[type] || 0;
            return (
              <div key={type} className="card">
                <div className="card-header">
                  <div className="card-glyph"><Glyph size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="card-title">{meta.label}</div>
                    <div className="card-sub">{type}</div>
                  </div>
                  <span className="pill"><span className="dot"></span>{meta.category}</span>
                </div>
                <div className="card-desc">{meta.description}</div>
                <div className="card-foot">
                  <div className="card-ports" title="portas">
                    {meta.ports.principal.map((p: string) => <span key={`p-${p}`} className="card-port-dot" data-kind="principal" />)}
                    {meta.ports.auxiliary.map((p: string) => <span key={`a-${p}`} className="card-port-dot" />)}
                  </div>
                  <span>{uses} uso{uses === 1 ? '' : 's'}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="section-head" style={{ marginTop: 40 }}>
          <h2>Saúde dos Executores</h2>
          <a href="#" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none" }}>Ver detalhes →</a>
        </div>
        
        <table className="table">
          <thead>
            <tr>
              <th>Executor</th>
              <th>Tipo</th>
              <th>Réplicas</th>
              <th>Subjects</th>
              <th>Lag</th>
              <th>p95 latência</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {EXECUTORS.map((ex, i) => (
              <tr key={i}>
                <td className="mono">{ex[0]}</td>
                <td>{ex[1]}</td>
                <td className="num mono">{ex[2]}</td>
                <td className="mono muted">{ex[3]}</td>
                <td className="num mono">{ex[4]}</td>
                <td className="num mono">{ex[5]}</td>
                <td>
                  <span className="pill" data-tone={ex[6] as string}>
                    <span className="dot"></span>{ex[7]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
