import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getUsageSummary,
  getUsageTimeseries,
  getUsageBreakdown,
  getTrailBlocked,
  type UsageDimension,
} from "@shared/api/observability";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function fmtMs(ms: number): string {
  if (ms === 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return iso;
  }
}

function fmtDatetime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

// ── sub-components ────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: "var(--r-4)",
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      minWidth: 0,
    }}>
      <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 700, color: color ?? "var(--ink)", lineHeight: 1.1 }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{sub}</span>}
    </div>
  );
}

function SummarySection() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["observability", "summary"],
    queryFn: () => getUsageSummary(),
    staleTime: 60_000,
  });

  if (isLoading) return <div style={{ padding: 24, opacity: 0.5, fontSize: 13 }}>Carregando...</div>;
  if (error || !data) return <div style={{ padding: 24, fontSize: 13, color: "#dc2626" }}>Erro ao carregar dados de uso. Endpoint pode estar indisponível.</div>;

  const totalTokens = data.input_tokens + data.output_tokens;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
      <MetricCard label="Chamadas LLM" value={fmtNum(data.calls)} sub="no período" />
      <MetricCard label="Tokens totais" value={fmtNum(totalTokens)} sub={`${fmtNum(data.cached_tokens)} em cache`} />
      <MetricCard label="Custo estimado" value={fmtCost(data.cost_usd)} color={data.cost_usd > 5 ? "#d97706" : undefined} />
      <MetricCard label="Latência média" value={fmtMs(data.avg_latency_ms)} />
    </div>
  );
}

function TimeseriesSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["observability", "timeseries"],
    queryFn: () => getUsageTimeseries({ bucket: "day" }),
    staleTime: 60_000,
  });

  if (isLoading) return <div style={{ opacity: 0.5, fontSize: 13 }}>Carregando série temporal...</div>;
  if (!data?.length) return <div style={{ opacity: 0.4, fontSize: 13 }}>Sem dados de série temporal.</div>;

  const maxCalls = Math.max(...data.map((r) => r.calls), 1);

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--ink-2)" }}>
        Chamadas por dia (últimos 30 dias)
      </div>
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 3,
        height: 80,
        padding: "0 2px",
      }}>
        {data.slice(-30).map((row, i) => {
          const pct = row.calls / maxCalls;
          return (
            <div
              key={i}
              title={`${fmtDate(row.bucket_ts)}: ${row.calls} chamadas, ${fmtCost(row.cost_usd)}`}
              style={{
                flex: 1,
                minWidth: 4,
                height: `${Math.max(pct * 100, 4)}%`,
                background: pct > 0.8 ? "var(--accent)" : "color-mix(in srgb, var(--accent) 50%, transparent)",
                borderRadius: "2px 2px 0 0",
                cursor: "default",
                transition: "opacity 0.1s",
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>
        <span>{fmtDate(data[0]?.bucket_ts ?? "")}</span>
        <span>{fmtDate(data[data.length - 1]?.bucket_ts ?? "")}</span>
      </div>
    </div>
  );
}

function BreakdownSection() {
  const [dim, setDim] = useState<UsageDimension>("purpose");

  const { data, isLoading } = useQuery({
    queryKey: ["observability", "breakdown", dim],
    queryFn: () => getUsageBreakdown({ dimension: dim }),
    staleTime: 60_000,
  });

  const dimLabels: Record<UsageDimension, string> = {
    purpose: "Finalidade",
    provider: "Provedor",
    model: "Modelo",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>Agrupar por:</span>
        {(["purpose", "provider", "model"] as UsageDimension[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDim(d)}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              borderRadius: "var(--r-2)",
              border: "1px solid var(--line)",
              background: dim === d ? "var(--accent)" : "var(--surface)",
              color: dim === d ? "#fff" : "var(--ink)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
            }}
          >
            {dimLabels[d]}
          </button>
        ))}
      </div>

      {isLoading && <div style={{ opacity: 0.5, fontSize: 13 }}>Carregando...</div>}
      {!isLoading && (!data?.length) && (
        <div style={{ opacity: 0.4, fontSize: 13 }}>Sem dados de detalhamento disponíveis.</div>
      )}
      {!isLoading && data && data.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--line)" }}>
              <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>{dimLabels[dim]}</th>
              <th style={{ textAlign: "right", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Chamadas</th>
              <th style={{ textAlign: "right", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Tokens entrada</th>
              <th style={{ textAlign: "right", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Tokens saída</th>
              <th style={{ textAlign: "right", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Custo</th>
              <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>% custo</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "9px 12px", fontWeight: 500 }}>{row.dimension || "—"}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtNum(row.calls)}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-3)" }}>{fmtNum(row.input_tokens)}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-3)" }}>{fmtNum(row.output_tokens)}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtCost(row.cost_usd)}</td>
                <td style={{ padding: "9px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      height: 6,
                      width: `${Math.round((row.cost_pct ?? 0) * 100)}%`,
                      maxWidth: 80,
                      background: "var(--accent)",
                      borderRadius: 3,
                      opacity: 0.75,
                    }} />
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {((row.cost_pct ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BlockedSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["observability", "blocked"],
    queryFn: getTrailBlocked,
    staleTime: 60_000,
  });

  if (isLoading) return <div style={{ opacity: 0.5, fontSize: 13 }}>Carregando...</div>;
  if (!data?.length) {
    return (
      <div style={{ padding: 24, textAlign: "center", opacity: 0.4, fontSize: 13 }}>
        Nenhum evento bloqueado registrado.
      </div>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: "2px solid var(--line)" }}>
          <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Ferramenta</th>
          <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Motivo</th>
          <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Sessão</th>
          <th style={{ textAlign: "right", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Data/hora</th>
        </tr>
      </thead>
      <tbody>
        {data.map((ev) => (
          <tr key={ev.event_id} style={{ borderBottom: "1px solid var(--line)" }}>
            <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>{ev.tool || "—"}</td>
            <td style={{ padding: "9px 12px", color: "#dc2626", fontSize: 12 }}>{ev.reason || "—"}</td>
            <td style={{ padding: "9px 12px", color: "var(--ink-3)", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
              {ev.session_id?.slice(0, 8) ?? "—"}
            </td>
            <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--ink-3)", fontSize: 11, whiteSpace: "nowrap" }}>
              {fmtDatetime(ev.ts)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

type Tab = "summary" | "breakdown" | "blocked";

const TAB_LABELS: Record<Tab, string> = {
  summary: "Resumo",
  breakdown: "Detalhamento",
  blocked: "Bloqueios",
};

export function ObservabilityPage() {
  const [tab, setTab] = useState<Tab>("summary");

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
      </div>

      <div style={{ padding: "24px 24px 0", maxWidth: 1100 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: "var(--ink)" }}>
          Observabilidade de Agentes
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 20px" }}>
          Uso de LLM, custo por decisão e eventos bloqueados.
        </p>

        {/* Tab bar */}
        <div style={{
          display: "flex",
          gap: 2,
          borderBottom: "1px solid var(--line)",
          marginBottom: 24,
        }}>
          {(["summary", "breakdown", "blocked"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: tab === t ? 600 : 400,
                border: "none",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                background: "none",
                color: tab === t ? "var(--accent)" : "var(--ink-3)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                transition: "color 0.1s",
                marginBottom: -1,
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ paddingBottom: 40 }}>
          {tab === "summary" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <SummarySection />
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-4)",
                padding: "16px 20px",
              }}>
                <TimeseriesSection />
              </div>
            </div>
          )}
          {tab === "breakdown" && (
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-4)",
              padding: 20,
            }}>
              <BreakdownSection />
            </div>
          )}
          {tab === "blocked" && (
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-4)",
              overflow: "hidden",
            }}>
              <BlockedSection />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
