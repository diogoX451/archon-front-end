import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetWorkflow, useGetWorkflowResult, useGetWorkflowStatus } from "@shared/hooks/useWorkflows";
import { useWorkflowEventsSSE } from "@shared/hooks/useWorkflowEventsSSE";
import { TimelineDrawer } from "@shared/ui/TimelineDrawer";
import { useProfiles } from "@shared/hooks/useProfiles";
import type { AgentSnapshot, WorkflowState } from "@shared/api/types";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";

const STATE_TONE: Record<string, string> = {
  idle: "warn",
  running: "run",
  waiting: "warn",
  completed: "ok",
  done: "ok",
  failed: "err",
  error: "err",
};

function timeDelta(from: string, to?: string): string {
  if (!to) return "—";
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (isNaN(a) || isNaN(b)) return "—";
  const ms = Math.max(0, b - a);
  if (ms < 1000) return `+${ms}ms`;
  if (ms < 60_000) return `+${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `+${m}m${s}s`;
}

function shortJSON(value: unknown, maxChars = 240): string {
  try {
    const s = JSON.stringify(value);
    if (!s) return "—";
    return s.length > maxChars ? s.slice(0, maxChars) + "…" : s;
  } catch {
    return String(value);
  }
}

type AgentRow = AgentSnapshot & {
  index: number;
  relative: string;
  isFinal: boolean;
};

function deriveTrace(state: WorkflowState | undefined): AgentRow[] {
  if (!state || !state.agents) return [];
  const entries = Object.values(state.agents).filter(Boolean) as AgentSnapshot[];
  entries.sort((a, b) => new Date(a.updated_at || "").getTime() - new Date(b.updated_at || "").getTime());
  const baseline = state.created_at || entries[0]?.updated_at || "";
  return entries.map((a, idx) => ({
    ...a,
    index: idx + 1,
    relative: timeDelta(baseline, a.updated_at),
    isFinal: a.state === "completed" || a.state === "failed",
  }));
}

// Auto-layout: simple left-to-right grid based on execution order.
// Each agent gets an (x, y) so we can render a static n8n-style mini-canvas
// even without profile positions in the workflow state.
const NODE_W = 200;
const NODE_H = 76;
const NODE_GAP_X = 80;
const NODE_GAP_Y = 28;

function layoutNodes(
  trace: AgentRow[],
  profilePositions?: Record<string, { x: number; y: number }>
): Record<string, { x: number; y: number }> {
  // Prefer positions persisted by the builder (metadata.ui.positions) so the
  // trace mirrors what the user designed. Fall back to grid auto-layout for
  // agents the profile doesn't carry coordinates for (or when no profile
  // positions exist at all).
  const out: Record<string, { x: number; y: number }> = {};
  const missing: AgentRow[] = [];
  for (const row of trace) {
    const id = String(row.id);
    const pos = profilePositions?.[id];
    if (pos) {
      out[id] = { x: pos.x, y: pos.y };
    } else {
      missing.push(row);
    }
  }
  const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, missing.length))));
  // Offset auto-laid-out nodes below the profile-positioned ones so they
  // don't overlap.
  const baselineY = Object.values(out).length
    ? Math.max(...Object.values(out).map((p) => p.y)) + NODE_H + 60
    : 24;
  missing.forEach((row, idx) => {
    const col = idx % cols;
    const rowIdx = Math.floor(idx / cols);
    out[String(row.id)] = {
      x: 40 + col * (NODE_W + NODE_GAP_X),
      y: baselineY + rowIdx * (NODE_H + NODE_GAP_Y),
    };
  });
  return out;
}

function bezier(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.45);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

const STATE_FILL: Record<string, string> = {
  idle: "var(--surface-2)",
  running: "oklch(0.85 0.10 60)",
  waiting: "oklch(0.85 0.10 60)",
  completed: "oklch(0.85 0.12 145)",
  done: "oklch(0.85 0.12 145)",
  failed: "oklch(0.80 0.14 25)",
  error: "oklch(0.80 0.14 25)",
};

function WorkflowGraph({
  trace,
  connections,
  profilePositions,
}: {
  trace: AgentRow[];
  connections?: any[];
  profilePositions?: Record<string, { x: number; y: number }>;
}) {
  if (trace.length === 0) return null;
  const positions = layoutNodes(trace, profilePositions);
  const maxCol = Math.max(...Object.values(positions).map((p) => p.x)) + NODE_W + 40;
  const maxRow = Math.max(...Object.values(positions).map((p) => p.y)) + NODE_H + 24;
  const conns = (connections || []).filter((c) => positions[c.from] && positions[c.to]);

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: "auto",
        position: "relative",
        marginBottom: 20,
        background: "var(--surface)",
      }}
    >
      <svg
        width={maxCol}
        height={maxRow}
        style={{ display: "block", minWidth: "100%" }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--ink-3)" />
          </marker>
        </defs>
        {/* Connections */}
        {conns.map((c, idx) => {
          const a = { x: positions[c.from].x + NODE_W, y: positions[c.from].y + NODE_H / 2 };
          const b = { x: positions[c.to].x, y: positions[c.to].y + NODE_H / 2 };
          return (
            <path
              key={idx}
              d={bezier(a, b)}
              fill="none"
              stroke="var(--ink-3)"
              strokeWidth="1.5"
              markerEnd="url(#arrowhead)"
            />
          );
        })}
        {/* Sequential fallback arrows when no explicit connections */}
        {conns.length === 0 && trace.length > 1 && trace.map((row, i) => {
          if (i === trace.length - 1) return null;
          const from = positions[String(row.id)];
          const to = positions[String(trace[i + 1].id)];
          if (!from || !to) return null;
          const a = { x: from.x + NODE_W, y: from.y + NODE_H / 2 };
          const b = { x: to.x, y: to.y + NODE_H / 2 };
          return (
            <path
              key={`seq-${i}`}
              d={bezier(a, b)}
              fill="none"
              stroke="var(--ink-4)"
              strokeWidth="1.25"
              strokeDasharray="4 4"
              markerEnd="url(#arrowhead)"
            />
          );
        })}
        {/* Nodes */}
        {trace.map((row) => {
          const pos = positions[String(row.id)];
          if (!pos) return null;
          const fill = STATE_FILL[row.state] || STATE_FILL.idle;
          return (
            <g key={String(row.id)} transform={`translate(${pos.x}, ${pos.y})`}>
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={8}
                ry={8}
                fill={fill}
                stroke="var(--line)"
                strokeWidth="1"
              />
              <text x={12} y={20} fontSize="11" fontFamily="var(--font-mono)" fill="var(--ink)">
                #{row.index} {String(row.id).slice(0, 22)}
              </text>
              <text x={12} y={38} fontSize="10" fill="var(--ink-3)">
                {row.type} · {row.state}
              </text>
              <text x={12} y={56} fontSize="10" fontFamily="var(--font-mono)" fill="var(--ink-3)">
                {row.relative}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function AgentCard({ row }: { row: AgentRow }) {
  const [open, setOpen] = useState(row.state === "failed" || row.state === "error");
  const tone = STATE_TONE[row.state] || "warn";

  return (
    <div className="card" style={{ padding: 14, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--ink-2)",
          }}
        >
          {row.index}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500 }}>{row.id}</span>
            <span className="muted" style={{ fontSize: 11 }}>{row.type}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
            {row.relative} · atualizado: {row.updated_at ? new Date(row.updated_at).toLocaleTimeString("pt-BR") : "—"}
          </div>
        </div>
        <span className="pill" data-tone={tone}>
          <span className="dot"></span>{row.state}
        </span>
        <button className="btn ghost" onClick={() => setOpen((o) => !o)} style={{ padding: "4px 10px", fontSize: 11 }}>
          {open ? "Ocultar" : "Detalhes"}
        </button>
      </div>

      {!open && (row.input || row.output) && (
        <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)", display: "grid", gap: 4 }}>
          {row.input != null && <div>input: <span style={{ color: "var(--ink-2)" }}>{shortJSON(row.input)}</span></div>}
          {row.output != null && <div>output: <span style={{ color: "var(--ink-2)" }}>{shortJSON(row.output)}</span></div>}
        </div>
      )}

      {open && (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {row.need && (
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>need</div>
              <pre style={preStyle}>{JSON.stringify(row.need, null, 2)}</pre>
            </div>
          )}
          {row.input != null && (
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>input</div>
              <pre style={preStyle}>{JSON.stringify(row.input, null, 2)}</pre>
            </div>
          )}
          {row.output != null && (
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>output</div>
              <pre style={preStyle}>{JSON.stringify(row.output, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const preStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-2)",
  padding: 10,
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  overflow: "auto",
  maxHeight: 260,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  margin: 0,
};

export function WorkflowResultPage() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("id") || "";
  const [workflowId, setWorkflowId] = useState(initialId);
  const [searchId, setSearchId] = useState(initialId);

  // Auto-load when URL carries an id
  useEffect(() => {
    if (initialId) {
      setWorkflowId(initialId);
      setSearchId(initialId);
    }
  }, [initialId]);

  const enabled = !!searchId;
  // SSE stream is the primary feed; the polling hooks remain as a fallback
  // for environments where SSE is blocked (proxies, restricted CDNs).
  const sse = useWorkflowEventsSSE(searchId, enabled);
  const sseLive = sse.status === "open" || sse.status === "terminal";
  const { data: status } = useGetWorkflowStatus(searchId, {
    enabled: enabled && !sseLive,
    refetchInterval: enabled && !sseLive ? 2000 : false,
  });
  const isTerminal =
    sse.status === "terminal" ||
    status?.status === "completed" ||
    status?.status === "failed" ||
    sse.state?.status === "completed" ||
    sse.state?.status === "failed";
  const { data: result, error: resultError } = useGetWorkflowResult(searchId, { enabled: enabled && isTerminal });
  const { data: pollState, isLoading: stateLoading, error: stateError } = useGetWorkflow(searchId, {
    enabled: enabled && !sseLive,
  });
  const state = sse.state || pollState;

  // Pull profile positions when the workflow state carries profile_id so the
  // trace canvas mirrors the builder layout (post-migration the field is set
  // on every spawn from /conversation/turns).
  const profileId = (state as any)?.profile_id || "";
  const { data: profiles } = useProfiles();
  const profilePositions = useMemo(() => {
    if (!profileId || !profiles) return undefined;
    const match = profiles.find((p) => (p.profile_id || p.id) === profileId);
    const ui = (match?.metadata as any)?.ui;
    const pos = ui?.positions;
    return pos && typeof pos === "object" ? (pos as Record<string, { x: number; y: number }>) : undefined;
  }, [profileId, profiles]);

  const trace = useMemo(() => deriveTrace(state), [state]);
  const [traceFilter, setTraceFilter] = useState("");
  const filteredTrace = useMemo(() => {
    const q = traceFilter.trim().toLowerCase();
    if (!q) return trace;
    return trace.filter((row) => {
      const hay = `${row.id} ${row.type} ${row.state} ${shortJSON(row.input, 120)} ${shortJSON(row.output, 120)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [trace, traceFilter]);
  const failedAgents = useMemo(
    () => trace.filter((a) => a.state === "failed" || a.state === "error"),
    [trace],
  );
  const waitingAgents = useMemo(
    () => trace.filter((a) => a.state === "waiting"),
    [trace],
  );
  const likelyError = useMemo(() => {
    if (result?.error) return String(result.error);
    const lastFailed = [...failedAgents].reverse()[0];
    if (!lastFailed) return "";
    const outputText = shortJSON(lastFailed.output, 500);
    if (outputText && outputText !== "—") return outputText;
    return shortJSON(lastFailed.need, 500);
  }, [result?.error, failedAgents]);
  const totalDuration = useMemo(() => {
    if (!state) return null;
    return timeDelta(state.created_at || "", state.updated_at);
  }, [state]);

  function handleSearch() {
    setSearchId(workflowId);
  }

  const liveStatus = status?.status || result?.status || (state ? "running" : "—");
  const [timelineOpen, setTimelineOpen] = useState(false);

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }} />
        <button
          className="btn ghost"
          onClick={() => setTimelineOpen(true)}
          disabled={!searchId}
          title="Abrir trail completo de auditoria deste workflow"
        >
          Auditoria
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Trace de Execução</h1>
        <p className="page-lead">
          Caminho percorrido pelo workflow: ordem em que os agentes foram acionados, entrada/saída de cada passo
          e duração total. Estilo n8n — útil para depurar como o planner decidiu, qual ferramenta acionou e o que retornou.
        </p>

        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="search-input"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              placeholder="workflow id (ex: 8f3a…)"
              style={{ flex: 1 }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button className="btn primary" onClick={handleSearch} disabled={stateLoading || !workflowId}>
              {stateLoading ? "Carregando…" : "Carregar trace"}
            </button>
          </div>
          {(stateError || resultError) && (
            <p style={{ color: "var(--err)", marginTop: 12, fontSize: 13 }}>
              {(stateError || resultError)?.message}
            </p>
          )}
        </div>

        {state && (
          <>
            <div className="stat-grid">
              <div className="stat">
                <div className="label">Status</div>
                <div className="value">
                  <span className="pill" data-tone={STATE_TONE[liveStatus] || "warn"}>
                    <span className="dot"></span>{liveStatus}
                  </span>
                </div>
              </div>
              <div className="stat">
                <div className="label">Agentes executados</div>
                <div className="value">{trace.length}</div>
              </div>
              <div className="stat">
                <div className="label">Duração total</div>
                <div className="value">{totalDuration || "—"}</div>
                <div className="delta">criado → atualizado</div>
              </div>
              <div className="stat">
                <div className="label">Conexões</div>
                <div className="value">{state.connections?.length ?? 0}</div>
              </div>
            </div>

            {(failedAgents.length > 0 || waitingAgents.length > 0 || likelyError) && (
              <div className="card" style={{ marginTop: 14, padding: 14, borderColor: failedAgents.length > 0 ? "var(--err)" : "var(--line)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: 13 }}>Diagnóstico rápido</strong>
                  {failedAgents.length > 0 && <span className="pill" data-tone="err">{failedAgents.length} falha(s)</span>}
                  {waitingAgents.length > 0 && <span className="pill" data-tone="warn">{waitingAgents.length} aguardando</span>}
                </div>
                {likelyError && (
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>
                    <strong style={{ color: "var(--err)" }}>Erro provável:</strong> {likelyError}
                  </div>
                )}
                <div style={{ color: "var(--ink-3)", fontSize: 12 }}>
                  Dica: abra "Auditoria" para rastrear `need`/`response`/`result` e identificar onde o fluxo travou.
                </div>
              </div>
            )}

            <div className="section-head" style={{ marginTop: 24 }}>
              <h2>Mapa do fluxo</h2>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>auto-layout · cores por estado</span>
            </div>

            <WorkflowGraph
              trace={trace}
              connections={state.connections as any}
              profilePositions={profilePositions}
            />

            <div className="section-head" style={{ marginTop: 12 }}>
              <h2>Caminho executado (linha do tempo)</h2>
              {!isTerminal && (
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  {sseLive ? "stream ao vivo (SSE)" : sse.status === "error" ? "SSE indisponível, polling 2s…" : "conectando…"}
                </span>
              )}
            </div>

            <div className="toolbar" style={{ marginBottom: 10 }}>
              <input
                className="search-input"
                placeholder="Filtrar agentes por id, tipo, estado, input/output..."
                value={traceFilter}
                onChange={(e) => setTraceFilter(e.target.value)}
              />
              <div className="grow" />
              <span style={{ color: "var(--ink-3)", fontSize: 12 }}>
                {filteredTrace.length}/{trace.length} etapas
              </span>
            </div>

            {trace.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "var(--ink-3)" }}>
                Nenhum agente registrado ainda.
              </div>
            )}

            {filteredTrace.map((row) => (
              <AgentCard key={`${row.id}-${row.updated_at}`} row={row} />
            ))}

            {state.connections && state.connections.length > 0 && (
              <>
                <div className="section-head" style={{ marginTop: 24 }}>
                  <h2>Conexões disparadas</h2>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>Porta</th>
                      <th>→ To</th>
                      <th>Porta</th>
                      <th>Criada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.connections.map((c, idx) => (
                      <tr key={idx}>
                        <td className="mono">{(c as any).from}</td>
                        <td className="mono muted">{(c as any).from_port || "—"}</td>
                        <td className="mono">{(c as any).to}</td>
                        <td className="mono muted">{(c as any).to_port || "—"}</td>
                        <td className="muted">{(c as any).created_at ? new Date((c as any).created_at).toLocaleTimeString("pt-BR") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {result?.output != null && (
              <>
                <div className="section-head" style={{ marginTop: 24 }}>
                  <h2>Resultado final</h2>
                </div>
                <pre style={{ ...preStyle, maxHeight: 400 }}>
                  {JSON.stringify(result.output, null, 2)}
                </pre>
              </>
            )}
            {result?.error && (
              <div className="card" style={{ padding: 16, borderColor: "var(--err)", marginTop: 16 }}>
                <span style={{ color: "var(--err)", fontSize: 13 }}>{result.error}</span>
              </div>
            )}
          </>
        )}
      </div>

      {searchId && (
        <TimelineDrawer
          open={timelineOpen}
          onClose={() => setTimelineOpen(false)}
          scope={{ kind: "workflow", id: searchId }}
        />
      )}
    </>
  );
}
