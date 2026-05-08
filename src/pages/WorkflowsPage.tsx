import React, { useState } from "react";
import { Link } from "react-router-dom";
import { IconPlus } from "@shared/ui/icons/Icons";

const WORKFLOWS = [
  ["Atendimento WhatsApp", "Roteamento + RAG + handoff humano", "Acme Corp", "v3.2", "published", 6, 8420, 99.2, "há 2h",
    [[10, 50], [35, 30], [60, 30], [60, 70], [88, 50]]],
  ["Pipeline RAG (PDFs onboarding)", "Ingestão + chunk + embed + index", "Acme Corp", "v1.4", "published", 4, 1240, 98.8, "há 6h",
    [[10, 50], [35, 50], [60, 50], [88, 50]]],
  ["Decision automation · churn", "Score + segmento + ação", "FinTech Brasil", "v2.0", "published", 6, 3120, 97.4, "ontem",
    [[10, 50], [32, 30], [32, 70], [58, 50], [88, 50]]],
  ["Aggregator multi-API (CRM+Pay)", "Paralelo · 5 fontes externas", "Acme Corp", "v4.1", "published", 7, 5840, 99.8, "há 3 dias",
    [[10, 30], [10, 70], [35, 30], [35, 70], [60, 50], [88, 50]]],
  ["Telegram bot · ticket", "Captura + classificação + abertura", "Med Atende", "v2.3", "published", 4, 1820, 98.1, "há 4 dias",
    [[10, 50], [35, 50], [60, 30], [60, 70], [88, 50]]],
  ["Weather batch (200 cidades)", "Cron + API + CSV", "Acme Corp", "v1.0", "published", 2, 820, 100, "há 5 dias",
    [[10, 50], [40, 50], [80, 50]]],
  ["Suporte multi-turn (memória)", "Conversation + RAG + tools", "Med Atende", "v2.7", "published", 5, 4200, 99.5, "há 1 semana",
    [[10, 50], [35, 30], [35, 70], [65, 50], [88, 50]]],
  ["Webhook GitHub → Slack", "Filter + transform + post", "Acme Corp", "v1.2", "published", 4, 11400, 99.9, "há 1 semana",
    [[10, 50], [30, 50], [55, 50], [80, 50]]],
  ["Compliance scan · contratos", "Ingest + LLM-classify + alerta", "FinTech Brasil", "v0.8", "draft", 6, 84, 94.2, "há 1 semana",
    [[10, 50], [30, 30], [30, 70], [60, 50], [85, 50]]],
  ["Triagem clínica · sintomas", "Conversation + protocolo", "Med Atende", "v3.1", "published", 5, 2860, 98.9, "há 2 semanas",
    [[10, 50], [35, 50], [60, 30], [60, 70], [88, 50]]],
  ["Onboarding · KYC fintech", "Captura + OCR + decisão", "FinTech Brasil", "v1.5", "paused", 7, 420, 96.7, "há 3 semanas",
    [[10, 50], [28, 30], [28, 70], [55, 50], [78, 30], [78, 70]]],
  ["Lead enrichment + score", "CRM + APIs externas + planner", "Acme Corp", "v2.0", "published", 5, 3240, 99.0, "há 3 semanas",
    [[10, 50], [35, 50], [60, 30], [60, 70], [88, 50]]],
  ["Resumo diário (executivo)", "Cron + agregação + LLM + email", "Acme Corp", "v1.1", "published", 4, 30, 100, "há 1 mês",
    [[10, 50], [35, 50], [60, 50], [88, 50]]],
  ["NPS automático pós-atendimento", "Trigger + envio + coleta", "Med Atende", "v0.4", "draft", 3, 12, 91.7, "há 1 mês",
    [[15, 50], [50, 50], [85, 50]]],
];

const STATUS_TONE: Record<string, string> = { published: "ok", draft: "warn", paused: "warn", failed: "err" };
const STATUS_LABEL: Record<string, string> = { published: "publicado", draft: "rascunho", paused: "pausado" };
const TENANT_INITIALS: Record<string, [string, string]> = { "Acme Corp": ["A", "248"], "Med Atende": ["M", "155"], "FinTech Brasil": ["F", "35"] };

function renderMini(graph: number[][]) {
  const nodes = graph.map((n, i) => (
    <div key={i} className="mini-node" style={{ left: `${n[0]}%`, top: `${n[1]}%`, transform: "translate(-50%,-50%)" }} />
  ));
  
  const edges = [];
  for (let i = 0; i < graph.length - 1; i++) {
    for (let j = i + 1; j < graph.length; j++) {
      if (Math.abs(graph[i][0] - graph[j][0]) <= 30 && j - i <= 3) {
        const x1 = graph[i][0], y1 = graph[i][1], x2 = graph[j][0], y2 = graph[j][1];
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        edges.push(
          <div key={`e-${i}-${j}`} className="mini-edge" style={{ left: `${x1}%`, top: `${y1}%`, width: `${len}%`, transform: `rotate(${ang}deg)`, transformOrigin: "0 50%" }} />
        );
      }
    }
  }
  return <>{edges}{nodes}</>;
}

function tenantBadge(t: string) {
  const info = TENANT_INITIALS[t] || ["?", "240"];
  return (
    <div className="user-cell">
      <div className="user-avatar" style={{ background: `oklch(0.95 0.03 ${info[1]})`, borderColor: `oklch(0.85 0.06 ${info[1]})`, color: `oklch(0.40 0.12 ${info[1]})` }}>
        {info[0]}
      </div>
      <span className="name">{t}</span>
    </div>
  );
}

export function WorkflowsPage() {
  const [view, setView] = useState("list");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .wf-row-name { font-weight: 500; }
        .wf-row-desc { font-size: 11.5px; color: var(--ink-3); margin-top: 2px; }
        .mini-canvas {
          width: 96px; height: 56px;
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: 5px;
          background-image: radial-gradient(circle, var(--line) 0.6px, transparent 0.6px);
          background-size: 8px 8px;
          position: relative;
          flex-shrink: 0;
        }
        .mini-node {
          position: absolute;
          width: 14px; height: 8px;
          background: var(--surface);
          border: 1px solid var(--line-strong);
          border-radius: 2px;
        }
        .mini-edge { position: absolute; height: 1px; background: var(--ink-4); }
        .view-toggle {
          display: inline-flex;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-2);
          padding: 2px;
        }
        .view-toggle button {
          padding: 4px 10px;
          background: transparent;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          color: var(--ink-3);
          cursor: pointer;
        }
        .view-toggle button[data-active="true"] { background: var(--surface-2); color: var(--ink); }
      `}} />
      <div className="page-topbar">
        <span className="page-title">Workflows</span>
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">Todos os clientes</span>
        <div style={{ flex: 1 }}></div>
        <Link to="/workflows/builder" className="btn primary">
          <IconPlus size={14} />
          Novo workflow
        </Link>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Workflows</h1>
        <p className="page-lead">
          Workflows que você criou para clientes. Cada um é um grafo de agentes versionado, vinculado a um tenant. Clique para abrir no editor visual.
        </p>

        <div className="stat-grid">
          <div className="stat"><div className="label">Total</div><div className="value">28</div><div className="delta">+4 este mês</div></div>
          <div className="stat"><div className="label">Publicados</div><div className="value">22</div></div>
          <div className="stat"><div className="label">Rascunhos</div><div className="value">6</div></div>
          <div className="stat"><div className="label">Execuções (30d)</div><div className="value">42.108</div><div className="delta">+18%</div></div>
        </div>

        <div className="toolbar">
          <input className="search-input" placeholder="Buscar por nome, tag ou tenant…" />
          <select className="field-select" style={{ width: "auto" }}>
            <option>Todos clientes</option><option>Acme Corp</option><option>Med Atende</option><option>FinTech Brasil</option>
          </select>
          <select className="field-select" style={{ width: "auto" }}>
            <option>Todos status</option><option>Publicado</option><option>Rascunho</option><option>Pausado</option>
          </select>
          <select className="field-select" style={{ width: "auto" }}>
            <option>Atualizado recentemente</option><option>Mais executados</option><option>Ordem alfabética</option>
          </select>
          <div className="grow"></div>
          <div className="view-toggle">
            <button data-active={view === "list"} onClick={() => setView("list")}>Lista</button>
            <button data-active={view === "grid"} onClick={() => setView("grid")}>Grade</button>
          </div>
        </div>

        {view === "list" ? (
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Workflow</th>
                <th>Cliente</th>
                <th>Versão</th>
                <th>Status</th>
                <th className="num">Agentes</th>
                <th className="num">Execuções (30d)</th>
                <th>Sucesso</th>
                <th>Atualizado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {WORKFLOWS.map((w, i) => (
                <tr key={i} style={{ cursor: "pointer" }} onClick={() => window.location.href = "/workflows/builder"}>
                  <td style={{ width: 108 }}>
                    <div className="mini-canvas">{renderMini(w[9] as number[][])}</div>
                  </td>
                  <td>
                    <div className="wf-row-name">{w[0] as string}</div>
                    <div className="wf-row-desc">{w[1] as string}</div>
                  </td>
                  <td>{tenantBadge(w[2] as string)}</td>
                  <td className="mono muted">{w[3] as string}</td>
                  <td>
                    <span className="pill" data-tone={STATUS_TONE[w[4] as string]}>
                      <span className="dot"></span>{STATUS_LABEL[w[4] as string]}
                    </span>
                  </td>
                  <td className="num mono">{w[5] as number}</td>
                  <td className="num mono">{(w[6] as number).toLocaleString("pt-BR")}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="kbar" style={{ width: 60 }}>
                        <div className="kbar-fill" style={{ width: `${w[7]}%`, background: (w[7] as number) >= 98 ? 'var(--ok)' : (w[7] as number) >= 95 ? 'var(--warn)' : 'var(--err)' }} />
                      </div>
                      <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{(w[7] as number).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="muted">{w[8] as string}</td>
                  <td style={{ width: 24, color: "var(--ink-4)" }}>→</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="card-grid">
            {WORKFLOWS.map((w, i) => (
              <Link key={i} to="/workflows/builder" className="card" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="card-header">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="card-title">{w[0] as string}</div>
                    <div className="card-sub">{w[2] as string} · {w[3] as string}</div>
                  </div>
                  <span className="pill" data-tone={STATUS_TONE[w[4] as string]}>
                    <span className="dot"></span>{STATUS_LABEL[w[4] as string]}
                  </span>
                </div>
                <div className="mini-canvas" style={{ width: "100%", height: 96 }}>{renderMini(w[9] as number[][])}</div>
                <div className="card-desc">{w[1] as string}</div>
                <div className="card-foot">
                  <span>{w[5] as number} agentes · {(w[6] as number).toLocaleString("pt-BR")} execs</span>
                  <span>{w[8] as string}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
