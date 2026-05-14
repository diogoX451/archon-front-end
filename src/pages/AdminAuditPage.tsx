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
        className="btn"
        style={{ fontSize: 11, padding: "2px 8px" }}
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
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 12,
            minWidth: 280,
            maxWidth: 420,
            boxShadow: "0 4px 16px rgb(0 0 0 / 0.15)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <pre
            style={{
              margin: 0,
              fontSize: 11,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "var(--ink)",
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
        <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
          Registro de todas as mutações REST em{" "}
          <span className="mono">/api/v1</span>. Senhas e tokens aparecem como{" "}
          <span className="mono">***</span>.
        </p>

        {/* Filter bar */}
        <div
          className="card"
          style={{
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "flex-end",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600 }}>
            Actor ID
            <input
              className="search-input"
              placeholder="uuid do ator"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              style={{ width: 200 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600 }}>
            Tipo de alvo
            <input
              className="search-input"
              placeholder="ex: user, role, channel_credential"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              style={{ width: 200 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600 }}>
            ID do alvo
            <input
              className="search-input"
              placeholder="uuid / slug"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              style={{ width: 160 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600 }}>
            Desde (RFC3339)
            <input
              className="search-input"
              placeholder="2026-01-01T00:00:00Z"
              value={since}
              onChange={(e) => setSince(e.target.value)}
              style={{ width: 200 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600 }}>
            Até (RFC3339)
            <input
              className="search-input"
              placeholder="2026-12-31T23:59:59Z"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              style={{ width: 200 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600 }}>
            Limite
            <input
              className="search-input"
              type="number"
              min={1}
              max={1000}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              style={{ width: 80 }}
            />
          </label>
          <button className="btn primary" onClick={applyFilters}>
            Filtrar
          </button>
        </div>

        {auditQuery.isLoading && <div className="muted">Carregando…</div>}
        {auditQuery.error && (
          <div style={{ color: "var(--err)", marginBottom: 12 }}>
            {(auditQuery.error as Error).message}
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "10px 16px",
              borderBottom: "1px solid var(--border)",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {auditQuery.isLoading ? "…" : `${entries.length} entradas`}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={thStyle}>Quando</th>
                  {isSuper && <th style={thStyle}>Tenant</th>}
                  <th style={thStyle}>Ator</th>
                  <th style={thStyle}>Método</th>
                  <th style={thStyle}>Rota</th>
                  <th style={thStyle}>Ação</th>
                  <th style={thStyle}>Alvo</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>ms</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={tdStyle}>
                      {new Date(entry.occurred_at).toLocaleString()}
                    </td>
                    {isSuper && (
                      <td className="mono" style={{ ...tdStyle, color: "var(--muted)" }}>
                        {entry.tenant_slug || "—"}
                      </td>
                    )}
                    <td style={tdStyle} title={entry.actor_id}>
                      {entry.actor_email || entry.actor_id?.slice(0, 8) || "—"}
                    </td>
                    <td style={tdStyle}>
                      <span className="pill" data-tone={METHOD_TONE[entry.method] || "neutral"}>
                        {entry.method}
                      </span>
                    </td>
                    <td
                      className="mono"
                      style={{
                        ...tdStyle,
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={entry.path}
                    >
                      {entry.route || entry.path}
                    </td>
                    <td className="mono" style={{ ...tdStyle, color: "var(--muted)" }}>
                      {entry.action || "—"}
                    </td>
                    <td style={tdStyle}>
                      {entry.target_type ? (
                        <span>
                          <span className="mono" style={{ color: "var(--muted)" }}>
                            {entry.target_type}
                          </span>
                          {entry.target_id && (
                            <span
                              className="mono"
                              style={{ marginLeft: 4, fontSize: 10, color: "var(--muted)" }}
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
                    <td style={tdStyle}>
                      <span className="pill" data-tone={statusTone(entry.status_code)}>
                        {entry.status_code}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: "var(--muted)" }}>{entry.duration_ms}</td>
                    <td style={tdStyle}>
                      <SummaryPopover entry={entry} />
                    </td>
                  </tr>
                ))}
                {!auditQuery.isLoading && entries.length === 0 && (
                  <tr>
                    <td
                      colSpan={isSuper ? 10 : 9}
                      className="muted"
                      style={{ padding: 20, textAlign: "center" }}
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

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 8px",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 8px",
  verticalAlign: "middle",
};
