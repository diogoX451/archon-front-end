import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getUsageSummary,
  getUsageTimeseries,
  getUsageBreakdown,
  getTrailBlocked,
  getTrailTimeline,
  type UsageDimension,
} from "@shared/api/observability";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { getEventsTimeline } from "@shared/api/events";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtCost(usd: number): string {
  const n = Number(usd);
  if (!n) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
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

const ACTION_LABEL: Record<string, string> = {
  "0": "LLM call",
  "1": "Tool call",
  "2": "Tool blocked",
  "3": "Handoff",
  "4": "RAG query",
  "llm_call": "LLM call",
  "tool_call": "Tool call",
  "tool_blocked": "Bloqueado",
  "human_handoff": "Handoff",
  "rag_query": "RAG query",
};

const ACTION_COLOR: Record<string, string> = {
  "tool_blocked": "#dc2626",
  "2": "#dc2626",
  "human_handoff": "#d97706",
  "3": "#d97706",
  "llm_call": "var(--accent)",
  "0": "var(--accent)",
  "rag_query": "#16a34a",
  "4": "#16a34a",
};

function TrailSection() {
  const [sessionId, setSessionId] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["observability", "trail", submitted],
    queryFn: () => getTrailTimeline(submitted),
    enabled: !!submitted,
    staleTime: 30_000,
  });

  const events = data?.events ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <form
        onSubmit={(e) => { e.preventDefault(); if (sessionId.trim()) setSubmitted(sessionId.trim()); }}
        style={{ display: "flex", gap: 8 }}
      >
        <input
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="Session ID (UUID)"
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "var(--r-2)",
            border: "1px solid var(--line)",
            background: "var(--bg)",
            color: "var(--ink)",
            fontSize: 13,
            fontFamily: "var(--font-mono, monospace)",
          }}
        />
        <button
          type="submit"
          disabled={!sessionId.trim()}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--r-2)",
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            opacity: !sessionId.trim() ? 0.5 : 1,
          }}
        >
          Buscar
        </button>
      </form>

      {isLoading && <div style={{ opacity: 0.5, fontSize: 13 }}>Carregando trilha...</div>}
      {error && <div style={{ fontSize: 13, color: "#dc2626" }}>Sessão não encontrada ou endpoint indisponível.</div>}

      {!isLoading && submitted && events.length === 0 && !error && (
        <div style={{ opacity: 0.4, fontSize: 13 }}>Nenhum evento encontrado para esta sessão.</div>
      )}

      {events.length > 0 && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-4)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>
            {events.length} eventos · sessão {submitted.slice(0, 8)}…
          </div>
          <div style={{ position: "relative", padding: "16px 16px 16px 40px" }}>
            {/* vertical line */}
            <div style={{ position: "absolute", left: 24, top: 0, bottom: 0, width: 2, background: "var(--line)" }} />

            {events.map((ev, i) => {
              const typeStr = String(ev.action_type);
              const color = ACTION_COLOR[typeStr] ?? "var(--ink-3)";
              const label = ACTION_LABEL[typeStr] ?? typeStr;
              const isBlocked = typeStr === "tool_blocked" || typeStr === "2";

              return (
                <div key={ev.event_id ?? i} style={{ position: "relative", marginBottom: i < events.length - 1 ? 16 : 0 }}>
                  {/* dot */}
                  <div style={{
                    position: "absolute",
                    left: -22,
                    top: 2,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: color,
                    border: "2px solid var(--surface)",
                  }} />

                  <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color,
                      background: `color-mix(in srgb, ${color} 12%, transparent)`,
                      padding: "1px 7px",
                      borderRadius: 99,
                      whiteSpace: "nowrap",
                    }}>
                      {label}
                    </span>
                    {ev.tool_name && (
                      <code style={{ fontSize: 11, color: "var(--ink-2)" }}>{ev.tool_name}</code>
                    )}
                    <span style={{ fontSize: 10, color: "var(--ink-3)", marginLeft: "auto", whiteSpace: "nowrap" }}>
                      #{ev.sequence} · {ev.ts ? new Date(ev.ts).toLocaleTimeString("pt-BR") : "—"}
                    </span>
                  </div>
                  {isBlocked && ev.error && (
                    <div style={{ fontSize: 11, color: "#dc2626", marginTop: 2, paddingLeft: 2 }}>
                      {ev.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Audit payload of a speech-to-text result (AudioTranscribedEvent).
interface TranscribedPayload {
  transcribed_at?: string;
  conversation_id?: string;
  audio_message_id?: string;
  model?: string;
  transcription?: string;
  audio_url?: string;
}

// TranscriptionsSection lists recent STT results so the operator can verify
// transcription accuracy. Reads the audit timeline and keeps only
// conversation.audio.transcribed events — no dedicated endpoint needed.
function TranscriptionsSection() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["observability", "transcriptions"],
    queryFn: () => getEventsTimeline({ limit: 200 }),
    staleTime: 30_000,
  });

  const rows = (data ?? [])
    .filter((ev) => ev.subject === "conversation.audio.transcribed")
    .map((ev) => ({ ev, p: (ev.payload ?? {}) as TranscribedPayload }));

  if (isLoading) return <div style={{ opacity: 0.5, fontSize: 13 }}>Carregando transcrições...</div>;
  if (error) return <div style={{ fontSize: 13, color: "#dc2626" }}>Erro ao carregar transcrições.</div>;
  if (!rows.length) {
    return (
      <div style={{ padding: 24, textAlign: "center", opacity: 0.4, fontSize: 13 }}>
        Nenhuma transcrição registrada. Envie um áudio para a IA para vê-lo aqui.
      </div>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: "2px solid var(--line)" }}>
          <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12, whiteSpace: "nowrap" }}>Quando</th>
          <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Conversa</th>
          <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Modelo</th>
          <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Áudio</th>
          <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Transcrição</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ ev, p }, i) => (
          <tr key={ev.id ?? i} style={{ borderBottom: "1px solid var(--line)", verticalAlign: "top" }}>
            <td style={{ padding: "9px 12px", color: "var(--ink-3)", fontSize: 11, whiteSpace: "nowrap" }}>
              {p.transcribed_at ? fmtDatetime(p.transcribed_at) : (ev.occurred_at ? fmtDatetime(ev.occurred_at) : "—")}
            </td>
            <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "var(--ink-3)" }}>
              {(p.conversation_id ?? ev.conversation_id ?? "—").slice(0, 12)}
            </td>
            <td style={{ padding: "9px 12px" }}>
              <code style={{ fontSize: 11, color: "var(--accent)" }}>{p.model || "—"}</code>
            </td>
            <td style={{ padding: "9px 12px", minWidth: 200 }}>
              {p.audio_url
                ? <audio controls preload="none" src={p.audio_url} style={{ height: 32, maxWidth: 220 }} />
                : <span style={{ opacity: 0.4, fontSize: 11 }}>—</span>}
            </td>
            <td style={{ padding: "9px 12px", color: "var(--ink)", lineHeight: 1.4 }}>
              {p.transcription || <span style={{ opacity: 0.4 }}>(vazio)</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

type Tab = "summary" | "breakdown" | "blocked" | "trail" | "transcriptions";

const TAB_LABELS: Record<Tab, string> = {
  summary: "Resumo",
  breakdown: "Detalhamento",
  blocked: "Bloqueios",
  trail: "Trilha",
  transcriptions: "Transcrições",
};

export function ObservabilityPage() {
  const [tab, setTab] = useState<Tab>("summary");

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
      </div>

      <div className="page-body">
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
          {(["summary", "breakdown", "blocked", "trail", "transcriptions"] as Tab[]).map((t) => (
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
          {tab === "trail" && (
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-4)",
              padding: 20,
            }}>
              <TrailSection />
            </div>
          )}
          {tab === "transcriptions" && (
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-4)",
              overflow: "hidden",
            }}>
              <TranscriptionsSection />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
