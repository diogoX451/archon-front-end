import { useState } from "react";
import { useAuth } from "@app/auth-context";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useAdminAudit } from "@shared/hooks/useAdminAudit";
import type { AdminAuditEntry } from "@shared/api/adminAudit";

const METHOD_TONE: Record<string, string> = {
  POST: "ok",
  PATCH: "warn",
  PUT: "warn",
  DELETE: "err",
};

function statusTone(code: number): string {
  if (code >= 500) return "err";
  if (code >= 400) return "warn";
  return "ok";
}

function SummaryPopover({ entry }: { entry: AdminAuditEntry }) {
  const [open, setOpen] = useState(false);
  if (!entry.request_summary) return null;
  return (
    <span style={{ position: "relative" }}>
      <button
        type="button"
        className="btn"
        style={{ fontSize: 13, padding: "3px 10px" }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Fechar" : "Detalhes"}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            right: 0,
            zIndex: 30,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: 14,
            minWidth: 300,
            maxWidth: 480,
            boxShadow: "var(--shadow-3)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <pre
            style={{
              margin: 0,
              fontSize: 13,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "var(--ink)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {JSON.stringify(entry.request_summary, null, 2)}
          </pre>
        </div>
      )}
    </span>
  );
}

export function AdminAuditPage() {
  const { isSuper, activeTenantSlug } = useAuth();

  const [actorId, setActorId] = useState("");
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [limit, setLimit] = useState("200");
  const [applied, setApplied] = useState<{
    actorId: string;
    targetType: string;
    targetId: string;
    since: string;
    until: string;
    limit: number;
    tenant?: string;
  }>({ actorId: "", targetType: "", targetId: "", since: "", until: "", limit: 200 });

  const applyFilters = () =>
    setApplied({
      actorId: actorId.trim(),
      targetType: targetType.trim(),
      targetId: targetId.trim(),
      since: since.trim(),
      until: until.trim(),
      limit: Math.min(1000, Math.max(1, parseInt(limit) || 200)),
      tenant: isSuper ? undefined : activeTenantSlug || undefined,
    });

  const auditQuery = useAdminAudit({
    actor_id: applied.actorId || undefined,
    target_type: applied.targetType || undefined,
    target_id: applied.targetId || undefined,
    since: applied.since || undefined,
    until: applied.until || undefined,
    limit: applied.limit,
    tenant: applied.tenant,
  });

  const entries = auditQuery.data || [];

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
      </div>

      <div className="page-body">
        <h1 className="page-h1">Audit Log</h1>
        <p className="page-lead" style={{ marginBottom: 20 }}>
          Registro de todas as mutações REST em{" "}
          <span className="mono">/api/v1</span>. Senhas e tokens aparecem como{" "}
          <span className="mono">***</span>.
        </p>

        <div
          className="card"
          style={{
            padding: "16px 20px",
            marginBottom: 20,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "flex-end",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span className="field-label">Actor ID</span>
            <input
              className="search-input"
              placeholder="uuid do ator"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              style={{ width: 200 }}
              aria-label="Actor ID"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span className="field-label">Tipo de alvo</span>
            <input
              className="search-input"
              placeholder="user, role, channel…"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              style={{ width: 200 }}
              aria-label="Tipo de alvo"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span className="field-label">ID do alvo</span>
            <input
              className="search-input"
              placeholder="uuid / slug"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              style={{ width: 160 }}
              aria-label="ID do alvo"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span className="field-label">Desde (RFC3339)</span>
            <input
              className="search-input"
              placeholder="2026-01-01T00:00:00Z"
              value={since}
              onChange={(e) => setSince(e.target.value)}
              style={{ width: 210 }}
              aria-label="Data inicial (RFC3339)"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span className="field-label">Até (RFC3339)</span>
            <input
              className="search-input"
              placeholder="2026-12-31T23:59:59Z"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              style={{ width: 210 }}
              aria-label="Data final (RFC3339)"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span className="field-label">Limite</span>
            <input
              className="search-input"
              type="number"
              min={1}
              max={1000}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              aria-label="Limite de resultados"
              style={{ width: 90 }}
            />
          </label>
          <button type="button" className="btn primary" onClick={applyFilters}>
            Filtrar
          </button>
        </div>

        {auditQuery.isLoading && (
          <p style={{ color: "var(--ink-3)" }}>Carregando…</p>
        )}
        {auditQuery.error && (
          <p style={{ color: "var(--err)", marginBottom: 12 }}>
            {(auditQuery.error as Error).message}
          </p>
        )}

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "12px 18px",
              borderBottom: "1px solid var(--line)",
              fontWeight: 600,
              fontSize: 15,
              color: "var(--ink-2)",
            }}
          >
            {auditQuery.isLoading ? "…" : `${entries.length} entrada${entries.length !== 1 ? "s" : ""}`}
          </div>

          <div className="table-wrap" style={{ border: "none", borderRadius: 0, margin: 0 }}>
            <table className="table" style={{ border: "none", borderRadius: 0 }}>
              <thead>
                <tr>
                  <th>Quando</th>
                  {isSuper && <th>Empresa</th>}
                  <th>Ator</th>
                  <th>Método</th>
                  <th>Rota</th>
                  <th>Ação</th>
                  <th>Alvo</th>
                  <th>Status</th>
                  <th>ms</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ whiteSpace: "nowrap", fontSize: 14 }}>
                      {new Date(entry.occurred_at).toLocaleString()}
                    </td>
                    {isSuper && (
                      <td className="mono muted">
                        {entry.tenant_slug || "—"}
                      </td>
                    )}
                    <td style={{ fontSize: 14 }} title={entry.actor_id}>
                      {entry.actor_email || entry.actor_id?.slice(0, 8) || "—"}
                    </td>
                    <td>
                      <span className="pill" data-tone={METHOD_TONE[entry.method] || ""}>
                        {entry.method}
                      </span>
                    </td>
                    <td
                      className="mono"
                      style={{
                        maxWidth: 280,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 14,
                      }}
                      title={entry.path}
                    >
                      {entry.route || entry.path}
                    </td>
                    <td className="mono muted" style={{ fontSize: 14 }}>
                      {entry.action || "—"}
                    </td>
                    <td style={{ fontSize: 14 }}>
                      {entry.target_type ? (
                        <span>
                          <span className="mono" style={{ color: "var(--ink-2)" }}>
                            {entry.target_type}
                          </span>
                          {entry.target_id && (
                            <span
                              className="mono"
                              style={{ marginLeft: 5, fontSize: 13, color: "var(--ink-3)" }}
                              title={entry.target_id}
                            >
                              {entry.target_id.slice(0, 8)}…
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span className="pill" data-tone={statusTone(entry.status_code)}>
                        {entry.status_code}
                      </span>
                    </td>
                    <td className="muted" style={{ fontSize: 14, whiteSpace: "nowrap" }}>
                      {entry.duration_ms}
                    </td>
                    <td>
                      <SummaryPopover entry={entry} />
                    </td>
                  </tr>
                ))}
                {!auditQuery.isLoading && entries.length === 0 && (
                  <tr>
                    <td
                      colSpan={isSuper ? 10 : 9}
                      style={{ padding: 32, textAlign: "center", color: "var(--ink-3)" }}
                    >
                      Nenhuma entrada encontrada com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
