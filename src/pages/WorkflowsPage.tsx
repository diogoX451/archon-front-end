import { useState } from "react";
import { Link } from "react-router-dom";
import { IconPlus } from "@shared/ui/icons/Icons";
import { useListWorkflows } from "@shared/hooks/useWorkflows";
import { useEventStream } from "@shared/hooks/useEventStream";
import type { WorkflowState } from "@shared/api/types";

const STATUS_TONE: Record<string, string> = { running: "run", completed: "ok", waiting: "warn", failed: "err", spawning: "run" };
const STATUS_LABEL: Record<string, string> = { running: "executando", completed: "concluído", waiting: "aguardando", failed: "falhou", spawning: "iniciando" };

function agentCount(wf: WorkflowState): number {
  if (!wf.agents) return 0;
  return Object.keys(wf.agents).length;
}

function deriveStatus(wf: WorkflowState): string {
  if (wf.status) return String(wf.status);
  if (!wf.agents || Object.keys(wf.agents).length === 0) return "spawning";
  const agents = Object.values(wf.agents);
  if (agents.some((a) => a.state === "failed")) return "failed";
  if (agents.every((a) => a.state === "completed")) return "completed";
  if (agents.some((a) => a.state === "waiting")) return "waiting";
  return "running";
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return `há ${Math.floor(diff / 1000)}s`;
  if (diff < 3_600_000) return `há ${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `há ${Math.floor(diff / 3_600_000)}h`;
  return `há ${Math.floor(diff / 86_400_000)}d`;
}

export function WorkflowsPage() {
  const [view, setView] = useState("list");
  const { data: workflows, isLoading, error } = useListWorkflows();
  const { events: liveEvents, status: streamStatus } = useEventStream({
    bufferSize: 50,
  });
  const recent = liveEvents.slice(-8).reverse();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .wf-row-name { font-weight: 500; }
        .wf-row-desc { font-size: 11.5px; color: var(--ink-3); margin-top: 2px; }
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
          <div className="stat">
            <div className="label">Total</div>
            <div className="value">{isLoading ? "…" : (workflows?.length ?? 0)}</div>
            <div className="delta">via API</div>
          </div>
          <div className="stat">
            <div className="label">Executando</div>
            <div className="value" style={{ color: "oklch(0.45 0.13 60)" }}>
              {workflows?.filter((w) => deriveStatus(w) === "running").length ?? 0}
            </div>
          </div>
          <div className="stat">
            <div className="label">Concluídos</div>
            <div className="value">
              {workflows?.filter((w) => deriveStatus(w) === "completed").length ?? 0}
            </div>
          </div>
          <div className="stat">
            <div className="label">Falhos</div>
            <div className="value" style={{ color: "oklch(0.50 0.16 25)" }}>
              {workflows?.filter((w) => deriveStatus(w) === "failed").length ?? 0}
            </div>
          </div>
        </div>

        <div className="toolbar">
          <input className="search-input" placeholder="Buscar por nome, tag ou tenant…" />
          <div className="grow"></div>
          <span
            title={`SSE ${streamStatus} · ${liveEvents.length} eventos no buffer`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--ink-3)",
              fontSize: 12,
              marginRight: 8,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background:
                  streamStatus === "open"
                    ? "oklch(0.65 0.18 145)"
                    : streamStatus === "error"
                    ? "oklch(0.55 0.18 25)"
                    : "oklch(0.65 0.15 80)",
              }}
            />
            {streamStatus === "open" ? "ao vivo" : streamStatus === "error" ? "desconectado" : "conectando…"}
          </span>
          <span style={{ color: "var(--ink-3)", fontSize: 12 }}>
            {isLoading ? "carregando…" : `${workflows?.length ?? 0} workflows`}
          </span>
          <div className="view-toggle">
            <button data-active={view === "list"} onClick={() => setView("list")}>Lista</button>
            <button data-active={view === "grid"} onClick={() => setView("grid")}>Grade</button>
          </div>
        </div>

        {error && (
          <div className="card" style={{ padding: 16, borderColor: "var(--err)", marginBottom: 16 }}>
            <span style={{ color: "var(--err)", fontSize: 13 }}>
              Erro ao carregar workflows: {error.message}
            </span>
          </div>
        )}

        {isLoading && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink-3)" }}>
            Carregando workflows…
          </div>
        )}

        {!isLoading && (!workflows || workflows.length === 0) && !error && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>⚡</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum workflow encontrado</div>
            <div style={{ color: "var(--ink-3)", fontSize: 13 }}>
              Crie seu primeiro workflow clicando em "Novo workflow" acima.
            </div>
          </div>
        )}

        {workflows && workflows.length > 0 && view === "list" && (
          <table className="table">
            <thead>
              <tr>
                <th>Workflow ID</th>
                <th>Tenant</th>
                <th>User</th>
                <th>Status</th>
                <th className="num">Agentes</th>
                <th>Criado</th>
                <th>Atualizado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((wf) => {
                const status = deriveStatus(wf);
                return (
                  <tr key={wf.id} style={{ cursor: "pointer" }} onClick={() => window.location.href = `/workflows/result?id=${encodeURIComponent(wf.id)}`}>
                    <td className="mono" style={{ fontSize: 12 }}>{wf.id}</td>
                    <td className="muted mono" style={{ fontSize: 12 }}>{wf.tenant_id || "—"}</td>
                    <td className="muted mono" style={{ fontSize: 12 }}>{wf.user_id || "—"}</td>
                    <td>
                      <span className="pill" data-tone={STATUS_TONE[status] || "warn"}>
                        <span className="dot"></span>{STATUS_LABEL[status] || status}
                      </span>
                    </td>
                    <td className="num mono">{agentCount(wf)}</td>
                    <td className="muted">{timeAgo(wf.created_at)}</td>
                    <td className="muted">{timeAgo(wf.updated_at)}</td>
                    <td style={{ width: 24, color: "var(--ink-4)" }}>→</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {recent.length > 0 && (
          <div className="card" style={{ marginTop: 24, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Atividade ao vivo</strong>
              <span style={{ color: "var(--ink-4)", fontSize: 11 }}>
                últimos {recent.length} eventos · fonte: NATS via SSE
              </span>
            </div>
            <div style={{ display: "grid", gap: 4, fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
              {recent.map((ev, i) => (
                <div key={`${ev.subject}-${i}-${ev.received_at ?? ""}`} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--ink-4)", minWidth: 90 }}>
                    {ev.received_at ? new Date(ev.received_at).toLocaleTimeString("pt-BR") : "—"}
                  </span>
                  <span className="pill" data-tone={ev.event_type === "result" ? "ok" : ev.event_type === "command" ? "run" : "warn"} style={{ minWidth: 80, justifyContent: "center" }}>
                    {ev.event_type}
                  </span>
                  <span style={{ color: "var(--ink-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ev.subject}
                  </span>
                  <span style={{ color: "var(--ink-4)" }}>
                    {ev.workflow_id ? `wf=${ev.workflow_id.slice(0, 8)}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {workflows && workflows.length > 0 && view === "grid" && (
          <div className="card-grid">
            {workflows.map((wf) => {
              const status = deriveStatus(wf);
              return (
                <Link key={wf.id} to="/workflows/builder" className="card" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="card-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="card-title" style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{wf.id}</div>
                      <div className="card-sub">{wf.tenant_id || "sem tenant"} · {wf.user_id}</div>
                    </div>
                    <span className="pill" data-tone={STATUS_TONE[status] || "warn"}>
                      <span className="dot"></span>{STATUS_LABEL[status] || status}
                    </span>
                  </div>
                  <div className="card-desc">
                    {agentCount(wf)} agentes
                    {wf.agents && Object.values(wf.agents).map((a) => (
                      <span key={a.id} className="pill" style={{ marginLeft: 4, fontSize: 10 }}>{a.type}</span>
                    ))}
                  </div>
                  <div className="card-foot">
                    <span>{timeAgo(wf.created_at)}</span>
                    <span>→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
