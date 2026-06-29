import { useMemo, useState } from "react";
import { useAuth } from "@app/auth-context";
import { canAny } from "@shared/authz";
import { useRiskList, useReviewRisk } from "@shared/hooks/useRisk";
import type { RiskRecord, RiskSeverity } from "@shared/api/risk";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

type SevMeta = { label: string; bg: string; color: string };
const SEV_META: Record<RiskSeverity, SevMeta> = {
  critical: { label: "Crítico", bg: "#fde8e8", color: "#b91c1c" },
  high: { label: "Alto", bg: "#fee2e2", color: "#dc2626" },
  medium: { label: "Médio", bg: "#fff7e6", color: "#b45309" },
  low: { label: "Baixo", bg: "#eff6ff", color: "#2563eb" },
  none: { label: "Nenhum", bg: "#f3f4f6", color: "#6b7280" },
  unknown: { label: "Indeterminado", bg: "#f3f4f6", color: "#9ca3af" },
};

function sevMeta(s: RiskSeverity): SevMeta {
  return SEV_META[s] ?? SEV_META.unknown;
}

function SeverityBadge({ severity }: { severity: RiskSeverity }) {
  const meta = sevMeta(severity);
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 9px",
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      background: meta.bg,
      color: meta.color,
      border: "1px solid color-mix(in srgb, currentColor 16%, transparent)",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, display: "inline-block" }} />
      {meta.label}
    </span>
  );
}

function RiskDetail({ record, onClose }: { record: RiskRecord; onClose: () => void }) {
  const review = useReviewRisk();
  const c = record.classification;
  const isReviewed = record.review_status === "reviewed";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-primary, #fff)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid var(--border, #e5e7eb)", flexShrink: 0 }}>
        <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", opacity: 0.6, display: "flex" }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {record.conversation_id}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <SeverityBadge severity={c.overall_severity} />
            <span style={{ fontSize: 11, opacity: 0.6 }}>{fmtDate(record.created_at)}</span>
          </div>
        </div>
        {!isReviewed && c.overall_severity !== "none" && (
          <button
            type="button"
            onClick={() => review.mutate(record.id)}
            disabled={review.isPending}
            style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", background: "var(--color-accent, #2563eb)", color: "#fff", cursor: "pointer", opacity: review.isPending ? 0.5 : 1 }}
          >
            {review.isPending ? "Salvando..." : "Marcar como revisado"}
          </button>
        )}
        {isReviewed && (
          <span style={{ fontSize: 12, color: "#1a7a40", fontWeight: 600 }}>✓ Revisado</span>
        )}
      </div>

      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border, #e5e7eb)", fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", flexShrink: 0 }}>
        <div><span style={{ opacity: 0.5 }}>Modelo</span><br /><strong>{record.model || "—"}</strong></div>
        <div><span style={{ opacity: 0.5 }}>Status</span><br /><strong>{isReviewed ? "Revisado" : "Pendente"}</strong></div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {c.summary && <p style={{ fontSize: 13, lineHeight: 1.5, marginTop: 0 }}>{c.summary}</p>}
        {c.findings.length === 0 ? (
          <div style={{ opacity: 0.5, fontSize: 13 }}>Nenhum indício de risco registrado.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {c.findings.map((f, i) => (
              <div key={i} style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <strong style={{ fontSize: 13 }}>{f.category}</strong>
                  <SeverityBadge severity={f.severity} />
                </div>
                <blockquote style={{ margin: "6px 0", padding: "6px 10px", borderLeft: "3px solid var(--color-accent, #2563eb)", background: "var(--bg-secondary, #f9fafb)", fontSize: 13, fontStyle: "italic" }}>
                  “{f.evidence}”
                </blockquote>
                {f.rationale && <div style={{ fontSize: 12, opacity: 0.7 }}>{f.rationale}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function RiskPage() {
  const { isSuper, hasPermission } = useAuth();
  const [selected, setSelected] = useState<RiskRecord | null>(null);
  const [minSeverity, setMinSeverity] = useState<RiskSeverity | "">("high");
  const [onlyPending, setOnlyPending] = useState(true);
  const [query, setQuery] = useState("");

  const canView = canAny({ isSuper, hasPermission }, ["workflow_list", "conversation_turn"]);

  const { data, isLoading, error, refetch } = useRiskList(
    { minSeverity: minSeverity || undefined, onlyPending },
    { refetchInterval: 10_000 }
  );

  const all = data?.classifications ?? [];
  const records = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) => {
      const hay = `${r.conversation_id} ${r.classification.summary} ${r.classification.findings.map((f) => f.category).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [all, query]);

  if (!canView) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5, fontSize: 14 }}>
        Sem permissão para visualizar classificações de risco.
      </div>
    );
  }

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 48px)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
          <span className="pill"><span className="dot" />Total: {all.length}</span>
          <select
            aria-label="Severidade mínima"
            value={minSeverity}
            onChange={(e) => setMinSeverity(e.target.value as RiskSeverity | "")}
            style={{ padding: "6px 10px", fontSize: 13, borderRadius: "var(--r-2)", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)" }}
          >
            <option value="">Todas as severidades</option>
            <option value="low">Baixo ou acima</option>
            <option value="medium">Médio ou acima</option>
            <option value="high">Alto ou acima</option>
            <option value="critical">Apenas crítico</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
            Só pendentes de revisão
          </label>
          <div style={{ flex: 1 }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por conversa, categoria ou resumo..."
            style={{ width: "min(420px, 100%)", minWidth: 220, padding: "7px 10px", borderRadius: "var(--r-2)", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 13, outline: "none" }}
          />
          <button type="button" onClick={() => refetch()} aria-label="Atualizar" style={{ padding: "6px 10px", fontSize: 12, borderRadius: 6, border: "1px solid var(--line)", background: "transparent", cursor: "pointer" }}>
            ↻
          </button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
          <div style={{ width: selected ? 360 : "100%", maxWidth: selected ? 360 : undefined, flexShrink: 0, borderRight: selected ? "1px solid var(--border, #e5e7eb)" : "none", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.2s" }}>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {isLoading && <div style={{ padding: 20, opacity: 0.5, fontSize: 13, textAlign: "center" }}>Carregando...</div>}
              {error && <div style={{ padding: 20, fontSize: 13, color: "#dc2626", textAlign: "center" }}>Erro ao carregar classificações.</div>}
              {!isLoading && !error && records.length === 0 && (
                <div style={{ padding: 32, opacity: 0.4, fontSize: 13, textAlign: "center" }}>Nenhuma classificação encontrada.</div>
              )}
              {records.map((r) => {
                const isSelected = selected?.id === r.id;
                const cats = r.classification.findings.map((f) => f.category);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelected(isSelected ? null : r)}
                    style={{ width: "100%", textAlign: "left", padding: "13px 16px", borderBottom: "1px solid var(--border, #e5e7eb)", background: isSelected ? "var(--bg-secondary, #f3f4f6)" : "transparent", border: "none", borderBottomColor: "var(--border, #e5e7eb)", borderBottomWidth: 1, borderBottomStyle: "solid", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {r.conversation_id}
                      </span>
                      <SeverityBadge severity={r.classification.overall_severity} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.6, flexWrap: "wrap" }}>
                      {cats.length > 0 ? cats.map((cat, i) => (
                        <span key={i} style={{ padding: "1px 7px", borderRadius: 99, background: "var(--bg-secondary, #f3f4f6)" }}>{cat}</span>
                      )) : <span>sem indícios</span>}
                      <span style={{ marginLeft: "auto" }}>{fmtDate(r.created_at)}</span>
                      {r.review_status === "pending" && r.classification.overall_severity !== "none" && (
                        <span style={{ color: "#b45309", fontWeight: 600 }}>• pendente</span>
                      )}
                    </div>
                    {r.classification.summary && (
                      <div style={{ fontSize: 11, opacity: 0.55, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.classification.summary}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selected && (
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <RiskDetail key={selected.id} record={selected} onClose={() => setSelected(null)} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
