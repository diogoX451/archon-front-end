import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IconPlus } from "@shared/ui/icons/Icons";
import { useListWorkflows } from "@shared/hooks/useWorkflows";
import { useEventStream } from "@shared/hooks/useEventStream";
import { useQuery } from "@tanstack/react-query";
import { getEventsTimeline } from "@shared/api/events";
import type { WorkflowState } from "@shared/api/types";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("");
  const { data: workflows, isLoading, error } = useListWorkflows();
  const { events: liveEvents, status: streamStatus } = useEventStream({
    bufferSize: 50,
  });
  const { data: auditEvents } = useQuery({
    queryKey: ["workflows-page-events", tenantFilter.trim() || "all"],
    queryFn: () => getEventsTimeline({ tenant: tenantFilter.trim() || undefined, limit: 120 }),
  });
  const recent = liveEvents.slice(-8).reverse();
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (workflows || []).filter((wf) => {
      const status = deriveStatus(wf);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (tenantFilter.trim() && (wf.tenant_id || "") !== tenantFilter.trim()) return false;
      if (!q) return true;
      const hay = `${wf.id} ${wf.tenant_id || ""} ${wf.user_id || ""} ${status}`.toLowerCase();
      return hay.includes(q);
    });
  }, [workflows, search, statusFilter, tenantFilter]);
  const failuresLastEvents = (auditEvents || []).filter((e) => e.event_type === "result" || e.event_type === "response").slice(-30);
  const byType = useMemo(() => {
    const out: Record<string, number> = {};
    (auditEvents || []).forEach((ev) => {
      const t = ev.event_type || "other";
      out[t] = (out[t] || 0) + 1;
    });
    return out;
  }, [auditEvents]);
  const recentFromAudit = useMemo(() => {
    const map = new Map<string, { workflow_id: string; tenant_id?: string; last_event?: string; subject?: string; event_type?: string }>();
    (auditEvents || []).forEach((ev) => {
      const id = (ev.workflow_id || "").trim();
      if (!id) return;
      const prev = map.get(id);
      const ts = ev.occurred_at || ev.received_at || "";
      const prevTs = prev?.last_event || "";
      if (!prev || ts >= prevTs) {
        map.set(id, {
          workflow_id: id,
          tenant_id: ev.tenant_id,
          last_event: ts,
          subject: ev.subject,
          event_type: ev.event_type,
        });
      }
    });
    return Array.from(map.values())
      .sort((a, b) => new Date(b.last_event || 0).getTime() - new Date(a.last_event || 0).getTime())
      .slice(0, 30);
  }, [auditEvents]);

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
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }}></div>
        <Link to="/workflows/builder" className="btn primary">
          <IconPlus size={14} />
          Novo workflow
        </Link>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Workflows</h1>

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
          <input
            className="search-input"
            placeholder="Buscar por workflow/tenant/user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="field-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">todos status</option>
            <option value="running">executando</option>
            <option value="waiting">aguardando</option>
            <option value="completed">concluído</option>
            <option value="failed">falhou</option>
            <option value="spawning">iniciando</option>
          </select>
          <input
            className="search-input"
            placeholder="tenant exato (opcional)"
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            style={{ maxWidth: 220 }}
          />
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
            {isLoading ? "carregando…" : `${filtered.length}/${workflows?.length ?? 0} workflows`}
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
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum workflow ativo encontrado</div>
            <div style={{ color: "var(--ink-3)", fontSize: 13 }}>
              Isso pode acontecer após restart. Abaixo mostramos os mais recentes pela auditoria de eventos.
            </div>
          </div>
        )}

        {!isLoading && (workflows?.length || 0) === 0 && recentFromAudit.length > 0 && (
          <div className="card" style={{ marginBottom: 16, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <strong style={{ fontSize: 13 }}>Workflows recentes (auditoria)</strong>
              <span style={{ color: "var(--ink-3)", fontSize: 11 }}>últimos {recentFromAudit.length}</span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Workflow ID</th>
                  <th>Tenant</th>
                  <th>Último evento</th>
                  <th>Tipo</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {recentFromAudit.map((r) => (
                  <tr key={r.workflow_id}>
                    <td className="mono" style={{ fontSize: 12 }}>
                      <Link to={`/workflows/result?id=${encodeURIComponent(r.workflow_id)}`} style={{ textDecoration: "none" }}>
                        {r.workflow_id}
                      </Link>
                    </td>
                    <td className="mono muted" style={{ fontSize: 12 }}>{r.tenant_id || "—"}</td>
                    <td className="mono" style={{ fontSize: 11.5 }}>{r.subject || "—"}</td>
                    <td><span className="pill" data-tone="warn">{r.event_type || "other"}</span></td>
                    <td className="muted">{r.last_event ? timeAgo(r.last_event) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && (workflows?.length || 0) > 0 && filtered.length === 0 && (
          <div className="card" style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Nenhum workflow encontrado com os filtros atuais</div>
            <div style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 10 }}>
              Ajuste busca, status ou tenant para voltar a listar resultados.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setTenantFilter("");
                }}
              >
                Limpar filtros
              </button>
            </div>
          </div>
        )}

        {(auditEvents || []).length > 0 && (
          <div className="card" style={{ marginBottom: 16, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Observabilidade rápida</strong>
              <span style={{ color: "var(--ink-3)", fontSize: 11 }}>
                {(auditEvents || []).length} eventos de auditoria {tenantFilter.trim() ? `· tenant ${tenantFilter.trim()}` : "· global"}
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {Object.entries(byType).map(([k, v]) => (
                <span key={k} className="pill" data-tone="run">{k}: {v}</span>
              ))}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, display: "grid", gap: 5 }}>
              {failuresLastEvents.slice(-6).map((ev, idx) => (
                <Link
                  key={`${ev.workflow_id || "wf"}-${idx}-${ev.occurred_at || ""}`}
                  to={ev.workflow_id ? `/workflows/result?id=${encodeURIComponent(ev.workflow_id)}` : "/workflows"}
                  style={{ color: "inherit", textDecoration: "none", display: "flex", gap: 8, alignItems: "center" }}
                >
                  <span className="pill" data-tone={ev.event_type === "result" ? "ok" : "warn"}>{ev.event_type}</span>
                  <span style={{ color: "var(--ink-2)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", flex: 1 }}>{ev.subject}</span>
                  <span style={{ color: "var(--ink-3)" }}>{ev.workflow_id ? ev.workflow_id.slice(0, 8) : "—"}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {filtered.length > 0 && view === "list" && (
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
              {filtered.map((wf) => {
                const status = deriveStatus(wf);
                return (
                  <tr key={wf.id}>
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
                    <td style={{ width: 24, color: "var(--ink-4)" }}>
                      <Link to={`/workflows/result?id=${encodeURIComponent(wf.id)}`} style={{ color: "inherit", textDecoration: "none" }}>→</Link>
                    </td>
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

        {recent.length === 0 && (
          <div className="card" style={{ marginTop: 24, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 13 }}>Atividade ao vivo</strong>
              <span style={{ color: "var(--ink-4)", fontSize: 11 }}>
                {streamStatus === "open"
                  ? "conectado, aguardando eventos…"
                  : streamStatus === "error"
                  ? "stream indisponível no momento"
                  : "conectando ao stream…"}
              </span>
            </div>
          </div>
        )}

        {filtered.length > 0 && view === "grid" && (
          <div className="card-grid">
            {filtered.map((wf) => {
              const status = deriveStatus(wf);
              return (
                <Link key={wf.id} to={`/workflows/result?id=${encodeURIComponent(wf.id)}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
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
