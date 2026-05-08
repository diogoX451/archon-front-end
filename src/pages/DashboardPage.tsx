import { useGetHealth } from "@shared/hooks/useHealth";
import { useListWorkflows } from "@shared/hooks/useWorkflows";
import type { WorkflowState } from "@shared/api/types";

const STATUS_TONE: Record<string, string> = { running: "run", completed: "ok", waiting: "warn", failed: "err", spawning: "run" };

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

function durationMs(wf: WorkflowState): string | null {
  if (!wf.created_at || !wf.updated_at) return null;
  const status = deriveStatus(wf);
  if (status !== "completed" && status !== "failed") return null;
  const diff = new Date(wf.updated_at).getTime() - new Date(wf.created_at).getTime();
  if (diff <= 0) return null;
  return `${diff}ms`;
}

export function DashboardPage() {
  const { data: health } = useGetHealth({ refetchInterval: 30_000 });
  const { data: workflows } = useListWorkflows();

  const total = workflows?.length ?? 0;
  const runningCount = workflows?.filter((w) => deriveStatus(w) === "running").length ?? 0;
  const completedCount = workflows?.filter((w) => deriveStatus(w) === "completed").length ?? 0;
  const successRate = total > 0 ? ((completedCount / total) * 100).toFixed(1) : "—";
  const recentWorkflows = workflows?.slice(0, 5) ?? [];

  return (
    <>
      <div className="page-topbar">
        <span className="page-title">Overview</span>
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">Painel geral</span>
        <div style={{ flex: 1 }}></div>
        {health && (
          <span
            className="pill"
            data-tone={health.status === "healthy" ? "ok" : "err"}
            style={{ fontSize: 11 }}
          >
            <span className="dot"></span>
            API {health.status} · {health.version}
          </span>
        )}
      </div>

      <div className="page-body">
        <h1 className="page-h1">Archon Control Plane</h1>
        <p className="page-lead">
          Painel centralizado de controle operacional do Archon: disparo de conversa, inspeção de workflows, eventos de canal, profiles e operações RAG.
        </p>

        <div className="stat-grid">
          <div className="stat">
            <div className="label">Workflows ativos</div>
            <div className="value">{total}</div>
            <div className="delta">via API</div>
          </div>
          <div className="stat">
            <div className="label">Em execução</div>
            <div className="value" style={{ color: "oklch(0.45 0.13 60)" }}>{runningCount}</div>
          </div>
          <div className="stat">
            <div className="label">Taxa de sucesso</div>
            <div className="value">{successRate}%</div>
          </div>
          <div className="stat">
            <div className="label">API Status</div>
            <div className="value" style={{ color: health?.status === "healthy" ? "oklch(0.45 0.13 155)" : "oklch(0.50 0.16 25)" }}>
              {health ? health.status : "…"}
            </div>
            <div className="delta">{health ? `v${health.version}` : "conectando"}</div>
          </div>
        </div>

        <div className="section-head"><h2>Fluxo Recomendado</h2></div>
        <div className="card-grid">
          <div className="card">
            <div className="card-header">
              <div className="card-glyph" style={{ background: "oklch(0.95 0.025 248)", borderColor: "oklch(0.85 0.06 248)", color: "oklch(0.40 0.12 248)" }}>
                <strong>1</strong>
              </div>
              <div style={{ flex: 1 }}>
                <div className="card-title">Dispare um evento</div>
                <div className="card-sub">Execuções ou Conversation</div>
              </div>
            </div>
            <div className="card-desc">
              Acione workflows através da página de Execuções ou do chat Conversation. O bus NATS irá rotear o evento para os agentes corretos.
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-glyph" style={{ background: "oklch(0.95 0.03 155)", borderColor: "oklch(0.82 0.08 155)", color: "oklch(0.36 0.10 155)" }}>
                <strong>2</strong>
              </div>
              <div style={{ flex: 1 }}>
                <div className="card-title">Acompanhe a execução</div>
                <div className="card-sub">Workflow Builder</div>
              </div>
            </div>
            <div className="card-desc">
              Abra o editor visual para observar os nós em execução em tempo real. Inspecione agentes, conexões e logs de eventos no Event Bus.
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-glyph" style={{ background: "oklch(0.95 0.03 35)", borderColor: "oklch(0.82 0.10 35)", color: "oklch(0.42 0.14 35)" }}>
                <strong>3</strong>
              </div>
              <div style={{ flex: 1 }}>
                <div className="card-title">Verifique os resultados</div>
                <div className="card-sub">Logs e payloads</div>
              </div>
            </div>
            <div className="card-desc">
              Cada execução gera um payload de resultado final. Confira a saída, latências e status de cada agente envolvido na cadeia.
            </div>
          </div>
        </div>

        <div className="section-head"><h2>Atividade Recente</h2></div>
        {recentWorkflows.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Workflow ID</th>
                <th>Tenant</th>
                <th>Status</th>
                <th className="num">Duração</th>
                <th>Quando</th>
              </tr>
            </thead>
            <tbody>
              {recentWorkflows.map((wf) => {
                const status = deriveStatus(wf);
                const dur = durationMs(wf);
                return (
                  <tr key={wf.id} style={{ cursor: "pointer" }}>
                    <td className="mono" style={{ fontSize: 12 }}>{wf.id}</td>
                    <td className="muted mono">{wf.tenant_id || "—"}</td>
                    <td>
                      <span className="pill" data-tone={STATUS_TONE[status] || "warn"}>
                        <span className="dot"></span>{status}
                      </span>
                    </td>
                    <td className="num mono">{dur || <span className="muted">—</span>}</td>
                    <td className="muted">{timeAgo(wf.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: "center", padding: 32, color: "var(--ink-3)", fontSize: 13 }}>
            {workflows === undefined ? "Carregando…" : "Nenhuma atividade recente. Dispare um workflow para começar."}
          </div>
        )}
      </div>
    </>
  );
}
