import { IconReset } from "@shared/ui/icons/Icons";
import { useListWorkflows } from "@shared/hooks/useWorkflows";
import type { WorkflowState } from "@shared/api/types";

const STATUS_TONE: Record<string, string> = { completed: "ok", running: "run", waiting: "warn", failed: "err", spawning: "run" };

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

function durationMs(wf: WorkflowState): string | null {
  if (!wf.created_at || !wf.updated_at) return null;
  const status = deriveStatus(wf);
  if (status !== "completed" && status !== "failed") return null;
  const diff = new Date(wf.updated_at).getTime() - new Date(wf.created_at).getTime();
  if (diff <= 0) return null;
  return `${diff}ms`;
}

export function EventsPage() {
  const { data: workflows, isLoading, error, refetch } = useListWorkflows();

  const runningCount = workflows?.filter((w) => deriveStatus(w) === "running").length ?? 0;
  const completedCount = workflows?.filter((w) => deriveStatus(w) === "completed").length ?? 0;
  const failedCount = workflows?.filter((w) => deriveStatus(w) === "failed").length ?? 0;
  const total = workflows?.length ?? 0;
  const successRate = total > 0 ? ((completedCount / total) * 100).toFixed(1) : "—";

  return (
    <>
      <div className="page-topbar">
        <span className="page-title">Execuções</span>
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">Histórico e observabilidade</span>
        <div style={{ flex: 1 }}></div>
        <button className="btn" onClick={() => refetch()}>
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
          <div className="stat">
            <div className="label">Total</div>
            <div className="value">{isLoading ? "…" : total}</div>
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
            <div className="label">Falhas</div>
            <div className="value" style={{ color: "oklch(0.50 0.16 25)" }}>{failedCount}</div>
          </div>
        </div>

        <div className="toolbar">
          <input className="search-input" placeholder="Buscar por workflow_id, user…" />
          <div className="grow"></div>
          <span style={{ color: "var(--ink-3)", fontSize: 12 }}>
            {isLoading ? "carregando…" : `${total} execuções`}
          </span>
        </div>

        {error && (
          <div className="card" style={{ padding: 16, borderColor: "var(--err)", marginBottom: 16 }}>
            <span style={{ color: "var(--err)", fontSize: 13 }}>
              Erro ao carregar execuções: {error.message}
            </span>
          </div>
        )}

        {isLoading && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink-3)" }}>
            Carregando execuções…
          </div>
        )}

        {!isLoading && (!workflows || workflows.length === 0) && !error && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>⚡</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhuma execução encontrada</div>
            <div style={{ color: "var(--ink-3)", fontSize: 13 }}>
              Execuções aparecerão aqui quando workflows forem disparados.
            </div>
          </div>
        )}

        {workflows && workflows.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Workflow ID</th>
                <th>Tenant</th>
                <th>User</th>
                <th>Status</th>
                <th className="num">Agentes</th>
                <th className="num">Duração</th>
                <th>Iniciado</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((wf) => {
                const status = deriveStatus(wf);
                const dur = durationMs(wf);
                return (
                  <tr key={wf.id} style={{ cursor: "pointer" }}>
                    <td className="mono" style={{ fontSize: 12 }}>{wf.id}</td>
                    <td className="muted mono" style={{ fontSize: 11.5 }}>{wf.tenant_id || "—"}</td>
                    <td className="muted mono" style={{ fontSize: 11.5 }}>{wf.user_id || "—"}</td>
                    <td>
                      <span className="pill" data-tone={STATUS_TONE[status] || "warn"}>
                        <span className="dot"></span>{status}
                      </span>
                    </td>
                    <td className="num mono">{agentCount(wf)}</td>
                    <td className="num mono">{dur || <span className="muted">—</span>}</td>
                    <td className="muted">{timeAgo(wf.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
