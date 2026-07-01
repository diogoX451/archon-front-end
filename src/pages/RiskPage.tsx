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

// ── severity ─────────────────────────────────────────────────────────────────

type SevMeta = { label: string; bg: string; color: string; dot: string; border: string };
const SEV_META: Record<RiskSeverity, SevMeta> = {
  critical: { label: "Crítico",       bg: "#fde8e8", color: "#b91c1c", dot: "#b91c1c", border: "#b91c1c" },
  high:     { label: "Alto",          bg: "#fee2e2", color: "#dc2626", dot: "#dc2626", border: "#dc2626" },
  medium:   { label: "Médio",         bg: "#fff7ed", color: "#b45309", dot: "#ea580c", border: "#ea580c" },
  low:      { label: "Baixo",         bg: "#eff6ff", color: "#2563eb", dot: "#3b82f6", border: "#3b82f6" },
  none:     { label: "Sem risco",     bg: "#f0fdf4", color: "#16a34a", dot: "#16a34a", border: "#16a34a" },
  unknown:  { label: "Indeterminado", bg: "#f3f4f6", color: "#9ca3af", dot: "#9ca3af", border: "#9ca3af" },
};

function sevMeta(s: RiskSeverity): SevMeta {
  return SEV_META[s] ?? SEV_META.unknown;
}

function SeverityBadge({ severity, label }: { severity: RiskSeverity; label?: string }) {
  const m = sevMeta(severity);
  const text = label?.trim() || m.label;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 99,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.01em",
      background: m.bg, color: m.color,
      border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
      {text}
    </span>
  );
}

// ── icons ─────────────────────────────────────────────────────────────────────

function IconRefresh() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

// ── detail panel ─────────────────────────────────────────────────────────────

function RiskDetail({ record, onClose }: { record: RiskRecord; onClose: () => void }) {
  const review = useReviewRisk();
  const c = record.classification;
  const isReviewed = record.review_status === "reviewed";
  const m = sevMeta(c.overall_severity);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 20px", borderBottom: "1px solid var(--line)", flexShrink: 0,
      }}>
        <button
          type="button" onClick={onClose} aria-label="Fechar"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, display: "flex", alignItems: "center", opacity: 0.55 }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {record.conversation_id}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
            {record.classification_label && (
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>{record.classification_label}</span>
            )}
            <SeverityBadge severity={c.overall_severity} label={record.severity_label} />
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{fmtDate(record.created_at)}</span>
          </div>
        </div>

        {!isReviewed && c.overall_severity !== "none" && (
          <button
            type="button"
            onClick={() => review.mutate(record.id)}
            disabled={review.isPending}
            style={{
              padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6,
              border: "none", background: "var(--accent)", color: "#fff",
              cursor: review.isPending ? "not-allowed" : "pointer",
              opacity: review.isPending ? 0.6 : 1, whiteSpace: "nowrap",
            }}
          >
            {review.isPending ? "Salvando…" : "Marcar como revisado"}
          </button>
        )}
        {isReviewed && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "6px 12px",
            borderRadius: 6, background: "#f0fdf4", color: "#16a34a",
          }}>
            ✓ Revisado
          </span>
        )}
      </div>

      {/* Meta */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px",
        padding: "12px 20px", borderBottom: "1px solid var(--line)",
        fontSize: 12, flexShrink: 0,
      }}>
        <div>
          <span style={{ color: "var(--ink-3)", fontSize: 11 }}>Modelo</span>
          <div style={{ fontWeight: 600, marginTop: 2 }}>{record.model || "—"}</div>
        </div>
        <div>
          <span style={{ color: "var(--ink-3)", fontSize: 11 }}>Status</span>
          <div style={{ fontWeight: 600, marginTop: 2 }}>{isReviewed ? "Revisado" : "Pendente"}</div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {c.summary && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink)", margin: "0 0 20px" }}>
            {c.summary}
          </p>
        )}

        {c.findings.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", opacity: 0.4, fontSize: 13 }}>
            Nenhum indício de risco registrado.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {c.findings.map((f, i) => {
              const fm = sevMeta(f.severity);
              return (
                <div key={i} style={{
                  border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden",
                }}>
                  <div style={{
                    padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
                    background: "var(--surface)", borderBottom: "1px solid var(--line)",
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {record.finding_labels?.[i] || f.category}
                    </span>
                    <SeverityBadge severity={f.severity} />
                  </div>
                  {f.evidence && (
                    <div style={{
                      margin: "14px 14px 10px",
                      borderLeft: `3px solid ${fm.border}`,
                      paddingLeft: 12,
                      fontSize: 13, fontStyle: "italic",
                      color: "var(--ink-2)", lineHeight: 1.5,
                    }}>
                      "{f.evidence}"
                    </div>
                  )}
                  {f.rationale && (
                    <p style={{ margin: "0 14px 14px", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                      {f.rationale}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {review.isError && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#dc2626" }}>
            Erro ao marcar como revisado. Tente novamente.
          </div>
        )}
      </div>
    </div>
  );
}

// ── card item ─────────────────────────────────────────────────────────────────

function RiskCard({
  record, selected, onClick,
}: {
  record: RiskRecord; selected: boolean; onClick: () => void;
}) {
  const m = sevMeta(record.classification.overall_severity);
  const isPending = record.review_status === "pending" && record.classification.overall_severity !== "none";
  const isReviewed = record.review_status === "reviewed";
  const cats = record.classification.findings.map(
    (f, i) => record.finding_labels?.[i] || f.category,
  );

  return (
    <button
      type="button" onClick={onClick}
      style={{
        width: "100%", textAlign: "left", cursor: "pointer",
        padding: "12px 14px",
        background: selected ? "color-mix(in srgb, var(--accent) 6%, var(--surface))" : "var(--surface)",
        border: selected
          ? `1.5px solid var(--accent)`
          : `1px solid var(--line)`,
        borderRadius: 8,
        display: "flex", flexDirection: "column", gap: 8,
        transition: "border-color 0.15s, background 0.15s",
        boxShadow: selected ? "0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent)" : "none",
      }}
    >
      {/* Row 1: id + severity + status */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{
          fontSize: 13, fontWeight: 700, color: "var(--ink)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          paddingTop: 1,
        }}>
          {record.conversation_id}
        </span>
        <SeverityBadge severity={record.classification.overall_severity} label={record.severity_label} />
      </div>

      {/* Row 2: categories */}
      {cats.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          {cats.map((cat, i) => (
            <span key={i} style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 4,
              background: `color-mix(in srgb, ${m.dot} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${m.dot} 28%, transparent)`,
              color: m.color, fontWeight: 600,
            }}>
              {cat}
            </span>
          ))}
          {!cats.length && record.classification_label && (
            <span style={{ fontSize: 11, opacity: 0.5 }}>{record.classification_label}</span>
          )}
        </div>
      )}

      {/* Row 3: summary */}
      {record.classification.summary && (
        <p style={{
          margin: 0, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.45,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {record.classification.summary}
        </p>
      )}

      {/* Row 4: date + review status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{fmtDate(record.created_at)}</span>
        {isPending && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
            background: `color-mix(in srgb, ${m.dot} 12%, transparent)`,
            color: m.color,
            border: `1px solid color-mix(in srgb, ${m.dot} 28%, transparent)`,
          }}>
            pendente
          </span>
        )}
        {isReviewed && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
            background: "#f0fdf4", color: "#16a34a",
            border: "1px solid #bbf7d0",
          }}>
            ✓ revisado
          </span>
        )}
      </div>
    </button>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export function RiskPage() {
  const { isSuper, hasPermission } = useAuth();
  const [selected, setSelected] = useState<RiskRecord | null>(null);
  const [minSeverity, setMinSeverity] = useState<RiskSeverity | "">("high");
  const [onlyPending, setOnlyPending] = useState(true);
  const [query, setQuery] = useState("");

  const canView = canAny({ isSuper, hasPermission }, ["workflow_list", "conversation_turn"]);

  const { data, isLoading, error, refetch } = useRiskList(
    { minSeverity: minSeverity || undefined, onlyPending },
    { refetchInterval: 10_000 },
  );

  const all = data?.classifications ?? [];

  const pendingCount = all.filter(
    (r) => r.review_status === "pending" && r.classification.overall_severity !== "none",
  ).length;

  const records = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) => {
      const hay = [
        r.conversation_id,
        r.classification.summary,
        r.classification_label,
        r.severity_label,
        ...(r.finding_labels ?? []),
        ...r.classification.findings.map((f) => f.category),
      ].join(" ").toLowerCase();
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
      </div>

      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)" }}>
        {/* Toolbar */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
          padding: "10px 16px", borderBottom: "1px solid var(--line)",
          background: "var(--surface)", flexShrink: 0,
        }}>
          <span style={{
            padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
            background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink-2)",
          }}>
            Total: {all.length}
          </span>

          <select
            aria-label="Severidade mínima"
            value={minSeverity}
            onChange={(e) => setMinSeverity(e.target.value as RiskSeverity | "")}
            style={{
              padding: "5px 10px", fontSize: 12, borderRadius: 6,
              border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", cursor: "pointer",
            }}
          >
            <option value="">Todas as severidades</option>
            <option value="low">Baixo ou acima</option>
            <option value="medium">Médio ou acima</option>
            <option value="high">Alto ou acima</option>
            <option value="critical">Apenas crítico</option>
          </select>

          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox" checked={onlyPending}
              onChange={(e) => setOnlyPending(e.target.checked)}
              style={{ accentColor: "var(--accent)", cursor: "pointer" }}
            />
            Só pendentes de revisão
            {pendingCount > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "1px 7px",
                borderRadius: 99, background: "#fef2f2", color: "#dc2626",
              }}>
                {pendingCount}
              </span>
            )}
          </label>

          <div style={{ flex: 1 }} />

          <input
            type="search" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por conversa, categoria ou resumo…"
            style={{
              width: "min(380px, 100%)", minWidth: 180,
              padding: "7px 12px", borderRadius: 6,
              border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)",
              fontSize: 13, outline: "none",
            }}
          />

          <button
            type="button" onClick={() => refetch()} aria-label="Atualizar"
            style={{
              padding: "6px 8px", borderRadius: 6, border: "1px solid var(--line)",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", color: "var(--ink-3)",
            }}
          >
            <IconRefresh />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
          {/* Card list */}
          <div style={{
            width: selected ? 360 : "100%",
            maxWidth: selected ? 360 : undefined,
            flexShrink: 0,
            borderRight: selected ? "1px solid var(--line)" : "none",
            overflowY: "auto",
            padding: "12px",
            display: "flex", flexDirection: "column", gap: 8,
            transition: "width 0.2s",
          }}>
            {isLoading && (
              <div style={{ padding: 32, textAlign: "center", opacity: 0.4, fontSize: 13 }}>
                Carregando…
              </div>
            )}
            {error && (
              <div style={{ padding: 24, fontSize: 13, color: "#dc2626", textAlign: "center" }}>
                Erro ao carregar classificações.
              </div>
            )}
            {!isLoading && !error && records.length === 0 && (
              <div style={{ padding: 48, textAlign: "center", opacity: 0.35, fontSize: 13 }}>
                {query ? "Nenhum resultado para a busca." : "Nenhuma classificação encontrada com os filtros atuais."}
              </div>
            )}
            {records.map((r) => (
              <RiskCard
                key={r.id}
                record={r}
                selected={selected?.id === r.id}
                onClick={() => setSelected(selected?.id === r.id ? null : r)}
              />
            ))}
          </div>

          {/* Detail */}
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
