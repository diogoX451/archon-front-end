import { IconReset } from "@shared/ui/icons/Icons";
import { useListWorkflows } from "@shared/hooks/useWorkflows";
import type { WorkflowState } from "@shared/api/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getEventsTimeline } from "@shared/api/events";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useAuth } from "@app/auth-context";

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
  const { isSuper, activeTenantSlug } = useAuth();
  const { data: workflows, isLoading, error, refetch } = useListWorkflows();
  // Non-super principals are pinned to their tenant by the backend
  // anyway; the input is only useful for super-admins comparing
  // tenants. Initialize from the JWT slug so the audit query targets
  // the right scope without an extra click.
  const [tenantFilter, setTenantFilter] = useState(isSuper ? "" : activeTenantSlug || "");
  const tenant = tenantFilter.trim();
  const { data: recentEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ["events-timeline", tenant || "all"],
    queryFn: () => getEventsTimeline({ tenant: tenant || undefined, limit: 200 }),
  });
  const eventCountByType = useMemo(() => {
    const count: Record<string, number> = {};
    (recentEvents || []).forEach((ev) => {
      const t = ev.event_type || "other";
      count[t] = (count[t] || 0) + 1;
    });
    return count;
  }, [recentEvents]);

  const runningCount = workflows?.filter((w) => deriveStatus(w) === "running").length ?? 0;
  const completedCount = workflows?.filter((w) => deriveStatus(w) === "completed").length ?? 0;
  const failedCount = workflows?.filter((w) => deriveStatus(w) === "failed").length ?? 0;
  const total = workflows?.length ?? 0;
  const successRate = total > 0 ? ((completedCount / total) * 100).toFixed(1) : "—";

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }}></div>
        <button className="btn" onClick={() => refetch()}>
          <IconReset size={14} />
          Atualizar
        </button>
        <button className="btn" onClick={() => refetchEvents()}>
          <IconReset size={14} />
          Atualizar eventos
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Execuções de Workflow</h1>
        <p className="page-lead">
          Cada execução é uma instância de um workflow consumindo eventos .
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

        {isSuper && (
          <div className="toolbar" style={{ marginTop: 10 }}>
            <input
              className="search-input"
              placeholder="Filtrar eventos por tenant (vazio = sistema todo)"
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
            />
            <div className="grow"></div>
            <span style={{ color: "var(--ink-3)", fontSize: 12 }}>
              {eventsLoading ? "eventos carregando…" : `${recentEvents?.length || 0} eventos`}
            </span>
          </div>
        )}

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

        <div style={{ marginTop: 18 }}>
          <h2 className="page-h1" style={{ fontSize: 18, marginBottom: 10 }}>Eventos Recentes</h2>
          <p className="page-lead" style={{ marginBottom: 8 }}>
            Visão de auditoria do sistema {tenant ? `para tenant ${tenant}` : "(todos os tenants)"}.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {Object.entries(eventCountByType).map(([k, v]) => (
              <span key={k} className="pill" data-tone="run">{k}: {v}</span>
            ))}
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Tipo</th>
                <th>Subject</th>
                <th>Tenant</th>
                <th>Workflow</th>
              </tr>
            </thead>
            <tbody>
              {(recentEvents || []).map((ev, i) => (
                <tr key={`${ev.id || "evt"}_${i}`}>
                  <td className="muted">{ev.occurred_at ? timeAgo(ev.occurred_at) : "—"}</td>
                  <td><span className="pill" data-tone="warn">{ev.event_type || "other"}</span></td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{ev.subject}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{ev.tenant_id || "—"}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{ev.workflow_id || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
