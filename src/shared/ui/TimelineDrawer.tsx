import { useMemo, useState } from "react";
import { useEventStream } from "@shared/hooks/useEventStream";
import { useConversationTimeline, useWorkflowTimeline } from "@shared/hooks/useTimeline";
import type { WorkflowEvent, WorkflowEventType } from "@shared/api/events";

type Scope =
  | { kind: "conversation"; id: string }
  | { kind: "workflow"; id: string };

interface Props {
  open: boolean;
  onClose: () => void;
  scope: Scope;
}

// Merge persisted history (from /timeline) with live SSE events. Server
// emits `received_at` for live events but only `occurred_at` for stored
// rows; we normalize to a single sort key. Dedup by (subject + occurred
// + correlation_id) since the same NATS message may show up in both
// streams during the small window between insert and SSE relay.
function mergeEvents(history: WorkflowEvent[], live: WorkflowEvent[]): WorkflowEvent[] {
  const key = (e: WorkflowEvent) =>
    `${e.subject}|${e.occurred_at || e.received_at || ""}|${e.correlation_id || ""}|${e.agent_id || ""}`;
  const seen = new Set<string>();
  const merged: WorkflowEvent[] = [];
  for (const e of history) {
    const k = key(e);
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(e);
    }
  }
  for (const e of live) {
    const k = key(e);
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(e);
    }
  }
  merged.sort((a, b) => {
    const ta = new Date(a.occurred_at || a.received_at || 0).getTime();
    const tb = new Date(b.occurred_at || b.received_at || 0).getTime();
    return ta - tb;
  });
  return merged;
}

const TONE_BY_TYPE: Record<WorkflowEventType, string> = {
  command: "run",
  interaction: "warn",
  need: "warn",
  response: "ok",
  result: "ok",
  conversation_turn: "ok",
  other: "muted",
};

function payloadSummary(ev: WorkflowEvent): string {
  const p: any = ev.payload;
  if (!p || typeof p !== "object") return "";
  // Surface the most useful field per event type — keeps the timeline
  // scannable without forcing the user to expand every row.
  if (ev.event_type === "need") {
    return p?.need_type || p?.type || JSON.stringify(p).slice(0, 80);
  }
  if (ev.event_type === "response") {
    if (typeof p?.text === "string") return p.text.slice(0, 120);
    if (typeof p?.output === "string") return p.output.slice(0, 120);
    if (p?.decision?.action) return `action=${p.decision.action}`;
    return JSON.stringify(p).slice(0, 120);
  }
  if (ev.event_type === "interaction") {
    return p?.agent_id ? `→ ${p.agent_id}` : p?.target || "";
  }
  if (ev.event_type === "result") {
    return p?.status ? `status=${p.status}` : "";
  }
  if (ev.event_type === "command") {
    return p?.profile_id ? `profile=${p.profile_id}` : p?.user_id ? `user=${p.user_id}` : "";
  }
  if (ev.event_type === "conversation_turn") {
    return p?.status ? `status=${p.status}` : "";
  }
  return "";
}

export function TimelineDrawer({ open, onClose, scope }: Props) {
  const isConv = scope.kind === "conversation";
  const histConv = useConversationTimeline(isConv ? scope.id : "", { enabled: open && isConv });
  const histWf = useWorkflowTimeline(!isConv ? scope.id : "", { enabled: open && !isConv });
  const history = (isConv ? histConv.data : histWf.data) || [];
  const isLoading = isConv ? histConv.isLoading : histWf.isLoading;
  const error = isConv ? histConv.error : histWf.error;

  const { events: live, status: liveStatus } = useEventStream({
    enabled: open,
    conversationId: isConv ? scope.id : undefined,
    workflowId: !isConv ? scope.id : undefined,
    bufferSize: 200,
  });

  const merged = useMemo(() => mergeEvents(history, live), [history, live]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<WorkflowEventType | "all">("all");

  const filtered = filter === "all" ? merged : merged.filter((e) => e.event_type === filter);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!open) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .tl-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 90; }
        .tl-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(560px, 100vw); background: var(--surface); border-left: 1px solid var(--line); z-index: 91; display: flex; flex-direction: column; box-shadow: var(--shadow-3); }
        .tl-head { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
        .tl-body { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; font-family: var(--font-mono); font-size: 11.5px; }
        .tl-row { padding: 6px 8px; border-radius: 4px; border-left: 3px solid transparent; cursor: pointer; }
        .tl-row:hover { background: var(--surface-2); }
        .tl-row[data-tone="ok"] { border-left-color: oklch(0.65 0.18 145); }
        .tl-row[data-tone="warn"] { border-left-color: oklch(0.65 0.15 80); }
        .tl-row[data-tone="run"] { border-left-color: oklch(0.55 0.18 250); }
        .tl-row-head { display: flex; gap: 8px; align-items: center; }
        .tl-row-time { color: var(--ink-4); min-width: 88px; }
        .tl-row-type { min-width: 100px; display: inline-flex; justify-content: center; }
        .tl-row-subj { color: var(--ink-2); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tl-row-summary { color: var(--ink-3); margin-left: 96px; margin-top: 2px; }
        .tl-row-payload { background: var(--surface-2); padding: 8px; border-radius: 4px; margin-top: 6px; margin-left: 96px; white-space: pre-wrap; max-height: 280px; overflow: auto; font-size: 10.5px; }
        .tl-filter { display: inline-flex; gap: 4px; flex-wrap: wrap; }
        .tl-filter button { padding: 3px 8px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 4px; font-size: 11px; cursor: pointer; color: var(--ink-3); }
        .tl-filter button[data-active="true"] { background: var(--accent); color: white; border-color: var(--accent); }
      `}} />
      <div className="tl-backdrop" onClick={onClose} />
      <aside className="tl-drawer">
        <div className="tl-head">
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Auditoria · timeline</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
              {scope.kind} = {scope.id}
            </div>
          </div>
          <span
            title={`SSE ${liveStatus}`}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: liveStatus === "open"
                ? "oklch(0.65 0.18 145)"
                : liveStatus === "error"
                ? "oklch(0.55 0.18 25)"
                : "oklch(0.65 0.15 80)",
            }}
          />
          <button type="button" className="btn ghost" onClick={onClose} style={{ padding: "4px 10px" }}>Fechar</button>
        </div>

        <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--line)" }}>
          <div className="tl-filter">
            {(["all", "command", "interaction", "need", "response", "result", "conversation_turn", "other"] as const).map((f) => (
              <button type="button" key={f} data-active={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? `tudo (${merged.length})` : f}
              </button>
            ))}
          </div>
        </div>

        <div className="tl-body">
          {isLoading && <div style={{ color: "var(--ink-3)" }}>carregando histórico…</div>}
          {error && (
            <div style={{ color: "var(--err)" }}>
              erro: {(error as Error).message}
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div style={{ color: "var(--ink-3)", textAlign: "center", padding: 20 }}>
              Nenhum evento registrado ainda. Envie uma mensagem para começar.
            </div>
          )}
          {filtered.map((ev, i) => {
            const k = `${ev.id || ev.subject}-${i}`;
            const isOpen = expanded.has(k);
            const tone = TONE_BY_TYPE[ev.event_type] || "muted";
            const when = ev.occurred_at || ev.received_at;
            const summary = payloadSummary(ev);
            return (
              <div key={k} className="tl-row" data-tone={tone} onClick={() => toggle(k)}>
                <div className="tl-row-head">
                  <span className="tl-row-time">{when ? new Date(when).toLocaleTimeString("pt-BR", { hour12: false }) : "—"}</span>
                  <span className="pill tl-row-type" data-tone={tone}>{ev.event_type}</span>
                  <span className="tl-row-subj">{ev.subject}</span>
                </div>
                {summary && !isOpen && <div className="tl-row-summary">{summary}</div>}
                {isOpen && (
                  <pre className="tl-row-payload">
                    {JSON.stringify(ev.payload, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
