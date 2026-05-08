import React from "react";
import { IconReset } from "@shared/ui/icons/Icons";

const RUNS = [
  ["wf_8a3f2c1d", "Assistente de Clima", "acme_corp", "completed", 3, 12, 1540, "há 12s"],
  ["wf_4e9b21cc", "Atendimento WhatsApp", "acme_corp", "running", 5, 28, null, "há 1m"],
  ["wf_2c1aa980", "Pipeline RAG (PDF onboarding)", "tenant_med", "completed", 4, 18, 4220, "há 3m"],
  ["wf_91dd02ef", "Aggregator multi-API (CRM+Pay)", "acme_corp", "completed", 7, 34, 2890, "há 5m"],
  ["wf_77ea4f00", "Decision automation · churn", "tenant_fin", "blocked", 6, 21, null, "há 8m"],
  ["wf_baf4e519", "Telegram bot · ticket", "tenant_med", "completed", 4, 16, 2110, "há 11m"],
  ["wf_36c8a2b7", "Weather batch (200 cities)", "acme_corp", "running", 2, 142, null, "há 12m"],
  ["wf_d019cc34", "RAG ingest · contratos.pdf", "tenant_fin", "failed", 2, 4, 1280, "há 18m"],
  ["wf_50aa7711", "Planner · LLM routing", "acme_corp", "completed", 5, 22, 3140, "há 22m"],
  ["wf_aac9018e", "Conversa multi-turn · suporte", "tenant_med", "completed", 3, 9, 890, "há 31m"],
  ["wf_113fef02", "Aggregator · 5 APIs", "tenant_fin", "completed", 6, 24, 2640, "há 38m"],
  ["wf_77019cab", "Webhook GitHub → Slack", "acme_corp", "completed", 4, 11, 540, "há 44m"],
];

const STATUS_TONE: Record<string, string> = { completed: "ok", running: "run", blocked: "warn", failed: "err" };

export function EventsPage() {
  return (
    <>
      <div className="page-topbar">
        <span className="page-title">Execuções</span>
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">Histórico e observabilidade</span>
        <div style={{ flex: 1 }}></div>
        <button className="btn">
          <IconReset size={14} />
          Atualizar
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Execuções de Workflow</h1>
        <p className="page-lead">
          Cada execução é uma instância de um workflow consumindo eventos do bus NATS. Status segue o lifecycle <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)" }}>spawning → running → blocked → completed</span>.
        </p>

        <div className="stat-grid">
          <div className="stat"><div className="label">Hoje</div><div className="value">1.284</div><div className="delta">+12% vs ontem</div></div>
          <div className="stat"><div className="label">Em execução</div><div className="value" style={{ color: "oklch(0.45 0.13 60)" }}>7</div><div className="delta">média 420ms</div></div>
          <div className="stat"><div className="label">Taxa de sucesso (24h)</div><div className="value">98,4%</div><div className="delta">+0,3pp</div></div>
          <div className="stat"><div className="label">p95 latência</div><div className="value">1,82s</div><div className="delta down">+120ms</div></div>
        </div>

        <div className="toolbar">
          <input className="search-input" placeholder="Buscar por workflow_id, user…" />
          <select className="field-select" style={{ width: "auto" }}>
            <option>Todos status</option><option>running</option><option>completed</option><option>blocked</option><option>failed</option>
          </select>
          <select className="field-select" style={{ width: "auto" }}>
            <option>Última 1h</option><option>Últimas 24h</option><option>Últimos 7 dias</option>
          </select>
          <div className="grow"></div>
          <span style={{ color: "var(--ink-3)", fontSize: 12 }}>12 de 1.284</span>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Workflow ID</th>
              <th>Nome</th>
              <th>Tenant</th>
              <th>Status</th>
              <th>Agentes</th>
              <th>Eventos</th>
              <th className="num">Duração</th>
              <th>Iniciado</th>
            </tr>
          </thead>
          <tbody>
            {RUNS.map((r, i) => (
              <tr key={i} style={{ cursor: "pointer" }}>
                <td className="mono">{r[0]}</td>
                <td>{r[1]}</td>
                <td className="muted mono" style={{ fontSize: 11.5 }}>{r[2]}</td>
                <td>
                  <span className="pill" data-tone={STATUS_TONE[r[3] as string]}>
                    <span className="dot"></span>{r[3]}
                  </span>
                </td>
                <td className="num mono">{r[4]}</td>
                <td className="num mono">{r[5]}</td>
                <td className="num mono">{r[6] ? `${r[6]}ms` : <span className="muted">—</span>}</td>
                <td className="muted">{r[7]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
