import React, { useRef, useEffect } from "react";
import { SIMULATED_TRACE } from "./data";
import { IconTerminal, IconChev } from "@shared/ui/icons/Icons";

type EventLogItem = {
  n: number;
  t: number;
  type: string;
  subject: string;
  summary: string;
  agent: string | null;
  status: string;
};

type EventDrawerProps = {
  open: boolean;
  onToggle: () => void;
  eventLog: EventLogItem[];
  runState: "idle" | "running" | "completed" | "error";
};

export function EventDrawer({ open, onToggle, eventLog, runState }: EventDrawerProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [eventLog]);

  return (
    <div className="drawer" data-open={open}>
      <div className="drawer-head" onClick={onToggle}>
        <IconTerminal className="icon-sm" style={{ color: "var(--ink-3)" }} />
        <span className="title">Event Bus · NATS JetStream</span>
        <span className="meta">
          {runState === "running" && `${eventLog.length}/${SIMULATED_TRACE.length} eventos`}
          {runState === "completed" && `${eventLog.length} eventos · concluído`}
          {runState === "idle" && "aguardando execução"}
        </span>
        <div className="spacer" />
        <IconChev className="icon-sm chev" />
      </div>
      {open && (
        <div className="drawer-body" ref={bodyRef}>
          {eventLog.length === 0 ? (
            <div className="drawer-empty">Clique em <strong style={{ color: "var(--ink-2)" }}>Executar</strong> para ver eventos passando pelo bus.</div>
          ) : eventLog.map((e, i) => (
            <div key={i} className="event-row">
              <span className="t">+{String(e.t).padStart(4, "0")}ms</span>
              <span className="type" data-type={e.type}>{e.type}</span>
              <span>
                <span className="summary">{e.summary}</span>
                <br />
                <span className="subject">{e.subject}</span>
              </span>
              {e.agent && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink-4)" }}>{e.agent}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
