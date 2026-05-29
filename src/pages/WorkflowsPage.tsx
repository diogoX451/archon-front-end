import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IconPlus } from "@shared/ui/icons/Icons";
import { useEventStream } from "@shared/hooks/useEventStream";
import { useQuery } from "@tanstack/react-query";
import { getWorkflowSummaries, getEventsTimeline } from "@shared/api/events";
import type { WorkflowSummary } from "@shared/api/events";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useAuth } from "@app/auth-context";
import { useTenants } from "@shared/hooks/useTenants";

const TERMINAL_EVENT_TYPES = new Set(["result", "rag_ingest", "conversation_turn", "response"]);

function deriveStatus(summary: WorkflowSummary): string {
  if (summary.status) return summary.status;
  const types = new Set(summary.event_types ?? []);
  if ([...types].some((t) => TERMINAL_EVENT_TYPES.has(t))) return "completed";
  if (types.has("need")) return "waiting";
  if (types.has("command")) return "running";
  return "spawning";
}

const STATUS_TONE: Record<string, string> = {
  running: "run",
  completed: "ok",
  waiting: "warn",
  failed: "err",
  spawning: "run",
};
const STATUS_LABEL: Record<string, string> = {
  running: "em atendimento",
  completed: "concluído",
  waiting: "aguardando lead",
  failed: "com problema",
  spawning: "começando",
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return `há ${Math.floor(diff / 1000)}s`;
  if (diff < 3_600_000) return `há ${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `há ${Math.floor(diff / 3_600_000)}h`;
  return `há ${Math.floor(diff / 86_400_000)}d`;
}

export function WorkflowsPage() {
  const { isSuper, activeTenantSlug } = useAuth();
  const { data: tenants } = useTenants();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState(isSuper ? "" : activeTenantSlug || "");

  const { data: summaries, isLoading, error, refetch } = useQuery({
    queryKey: ["workflow-summaries", tenantFilter.trim() || "all"],
    queryFn: () => getWorkflowSummaries({ tenant: tenantFilter.trim() || undefined, limit: 200 }),
    refetchInterval: 30_000,
  });

  const { data: auditEvents, refetch: refetchAudit } = useQuery({
    queryKey: ["workflows-page-events", tenantFilter.trim() || "all"],
    queryFn: () => getEventsTimeline({ tenant: tenantFilter.trim() || undefined, limit: 120 }),
  });

  const { events: liveEvents, status: streamStatus } = useEventStream({ bufferSize: 50 });
  const recent = liveEvents.slice(-8).reverse();

  const byType = useMemo(() => {
    const out: Record<string, number> = {};
    (auditEvents || []).forEach((ev) => {
      const t = ev.event_type || "other";
      out[t] = (out[t] || 0) + 1;
    });
    return out;
  }, [auditEvents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (summaries || []).filter((s) => {
      const status = deriveStatus(s);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${s.workflow_id} ${s.tenant_id || ""} ${status}`.toLowerCase();
      return hay.includes(q);
    });
  }, [summaries, search, statusFilter]);

  const total = summaries?.length ?? 0;
  const running = (summaries || []).filter((s) => deriveStatus(s) === "running").length;
  const completed = (summaries || []).filter((s) => deriveStatus(s) === "completed").length;
  const failed = (summaries || []).filter((s) => deriveStatus(s) === "failed").length;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : null;

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }}></div>
        <button type="button" className="btn" onClick={() => { refetch(); refetchAudit(); }} style={{ marginRight: 8 }}>
          Atualizar
        </button>
        {isSuper && (
          <Link to="/workflows/builder" className="btn primary">
            <IconPlus size={14} />
            Novo workflow
          </Link>
        )}
      </div>

      <div className="page-body">
        <h1 className="page-h1">Leads</h1>
        <p style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 24 }}>
          Acompanhe os leads que conversaram com seu agente.
        </p>

        <div className="stat-grid">
          <div className="stat">
            <div className="label">TOTAL DE LEADS</div>
            <div className="value">{isLoading ? "…" : total}</div>
          </div>
          <div className="stat">
            <div className="label">EM ATENDIMENTO</div>
            <div className="value" style={{ color: "oklch(0.45 0.13 60)" }}>{running}</div>
          </div>
          <div className="stat">
            <div className="label">TAXA DE CONCLUSÃO</div>
            <div className="value">{successRate !== null ? `${successRate}%` : "—%"}</div>
          </div>
          <div className="stat">
            <div className="label">COM PROBLEMA</div>
            <div className="value" style={{ color: "oklch(0.50 0.16 25)" }}>{failed}</div>
          </div>
        </div>

        <div className="toolbar" style={{ marginBottom: 8 }}>
          <input
            className="search-input"
            placeholder="Buscar lead..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar lead"
          />
          <select className="field-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">todos status</option>
            <option value="running">em atendimento</option>
            <option value="waiting">aguardando lead</option>
            <option value="completed">concluído</option>
            <option value="failed">com problema</option>
            <option value="spawning">começando</option>
          </select>
          <div className="grow" />
          <span style={{ color: "var(--ink-3)", fontSize: 12 }}>
            {isLoading ? "carregando…" : `${filtered.length} leads`}
          </span>
        </div>

        {isSuper && (
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <select
              className="field-select"
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              style={{ width: 260 }}
            >
              <option value="">Todos os tenants</option>
              {(tenants || []).map((t) => (
                <option key={t.id} value={t.slug}>{t.name} ({t.slug})</option>
              ))}
            </select>
            <div className="grow" />
            <span style={{ color: "var(--ink-3)", fontSize: 12 }}>
              {(auditEvents || []).length} eventos
            </span>
          </div>
        )}

        {error && (
          <div className="card" style={{ padding: 16, borderColor: "var(--err)", marginBottom: 16 }}>
            <span style={{ color: "var(--err)", fontSize: 13 }}>Erro ao carregar execuções.</span>
          </div>
        )}

        {!isLoading && total === 0 && !error && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>💬</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum lead ainda</div>
            <div style={{ color: "var(--ink-3)", fontSize: 13 }}>
              Quando alguém conversar com seu agente, vai aparecer aqui.
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <table className="table" style={{ marginBottom: 32 }}>
            <thead>
              <tr>
                <th>{isSuper ? "Workflow" : "Lead"}</th>
                {isSuper && <th>Tenant</th>}
                <th>Status</th>
                {isSuper && <th>Tipos</th>}
                <th className="num">Mensagens</th>
                <th>Começou</th>
                <th>Última atividade</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const status = deriveStatus(s);
                return (
                  <tr key={s.workflow_id}>
                    <td className="mono" style={{ fontSize: 12 }}>
                      <Link to={`/workflows/result?id=${encodeURIComponent(s.workflow_id)}`} style={{ textDecoration: "none" }}>
                        {s.workflow_id.slice(0, 8)}…
                      </Link>
                    </td>
                    {isSuper && <td className="muted mono" style={{ fontSize: 12 }}>{s.tenant_id || "—"}</td>}
                    <td>
                      <span className="pill" data-tone={STATUS_TONE[status] || "warn"}>
                        <span className="dot" />
                        {STATUS_LABEL[status] || status}
                      </span>
                    </td>
                    {isSuper && (
                      <td style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {(s.event_types || []).map((t) => (
                          <span key={t} className="pill" data-tone={t === "result" ? "ok" : t === "command" ? "run" : "warn"} style={{ fontSize: 11 }}>{t}</span>
                        ))}
                      </td>
                    )}
                    <td className="num mono">{s.event_count}</td>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{timeAgo(s.started_at)}</td>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{timeAgo(s.last_event_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {isSuper && Object.keys(byType).length > 0 && (
          <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(byType).map(([k, v]) => (
              <span key={k} className="pill" data-tone="run">{k}: {v}</span>
            ))}
          </div>
        )}

        {isSuper && (
        <>
        <div style={{ marginBottom: 16, color: "var(--ink-3)", fontSize: 12 }}>
          Visão de auditoria do sistema (todos os tenants).
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>QUANDO</th>
              <th>TIPO</th>
              <th>SUBJECT</th>
              <th>TENANT</th>
              <th>WORKFLOW</th>
            </tr>
          </thead>
          <tbody>
            {(auditEvents || []).map((ev, idx) => (
              <tr key={`${ev.id || idx}-${ev.occurred_at}`}>
                <td className="muted" style={{ whiteSpace: "nowrap" }}>{timeAgo(ev.occurred_at)}</td>
                <td>
                  <span className="pill" data-tone={ev.event_type === "result" ? "ok" : ev.event_type === "command" ? "run" : "warn"}>
                    {ev.event_type}
                  </span>
                </td>
                <td className="mono" style={{ fontSize: 11.5, maxWidth: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ev.subject}
                </td>
                <td className="muted mono" style={{ fontSize: 12 }}>{ev.tenant_id || "—"}</td>
                <td className="muted mono" style={{ fontSize: 12 }}>
                  {ev.workflow_id
                    ? <Link to={`/workflows/result?id=${encodeURIComponent(ev.workflow_id)}`} style={{ textDecoration: "none" }}>{ev.workflow_id}</Link>
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {recent.length > 0 && (
          <div className="card" style={{ marginTop: 24, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Atividade ao vivo</strong>
              <span style={{ color: "var(--ink-4)", fontSize: 11 }}>
                últimos {recent.length} eventos · fonte: NATS via SSE
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  color: "var(--ink-3)",
                  fontSize: 12,
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
        </>
        )}
      </div>
    </>
  );
}
