import { useEffect, useRef, useState } from "react";
import { withApiBase } from "@shared/api/client";
import { getToken } from "@shared/api/token";
import type { WorkflowEvent } from "@shared/api/events";

type StreamStatus = "idle" | "connecting" | "open" | "error";

interface Options {
  /** Subjects whitelist passed as ?subjects=. Defaults to the API's
   *  defaults (archon.command/interaction/response/result). */
  subjects?: string[];
  /** Filter events by workflow_id server-side. */
  workflowId?: string;
  /** Filter events by conversation_id server-side. */
  conversationId?: string;
  /** Buffer cap — older events drop off. Default 500. */
  bufferSize?: number;
  /** Toggle the connection without remounting. */
  enabled?: boolean;
}

/**
 * Subscribes to GET /api/v1/events/stream (SSE). Each NATS message
 * arrives as a typed envelope (see WorkflowEvent). The hook keeps a
 * rolling buffer and exposes connection status so the UI can show a
 * banner during disconnects.
 *
 * EventSource auto-reconnects on transient drops; we only surface the
 * "error" status so the UI can hint at connectivity issues. Auth rides
 * via ?token= (EventSource can't set Authorization headers).
 */
export function useEventStream({
  subjects,
  workflowId,
  conversationId,
  bufferSize = 500,
  enabled = true,
}: Options = {}) {
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    const params = new URLSearchParams();
    if (subjects && subjects.length > 0) params.set("subjects", subjects.join(","));
    if (workflowId) params.set("workflow_id", workflowId);
    if (conversationId) params.set("conversation_id", conversationId);
    const token = getToken();
    if (token) params.set("token", token);
    const url = withApiBase(`/api/v1/events/stream?${params.toString()}`);

    setStatus("connecting");
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    const handler = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as WorkflowEvent;
        setEvents((prev) => {
          const next = prev.concat(data);
          if (next.length > bufferSize) next.splice(0, next.length - bufferSize);
          return next;
        });
        setStatus("open");
      } catch {
        // ignore malformed lines
      }
    };

    // The server emits the event-type as the SSE event name (command,
    // need, response, ...). EventSource needs a listener per name; we
    // also subscribe to the default "message" channel as a safety net
    // in case the server falls back to anonymous data lines.
    const types = [
      "command",
      "interaction",
      "need",
      "response",
      "result",
      "conversation_turn",
      "other",
      "message",
    ];
    types.forEach((t) => es.addEventListener(t, handler as EventListener));

    es.onerror = () => {
      setStatus((prev) => (prev === "open" ? "error" : prev === "connecting" ? "error" : prev));
    };

    return () => {
      types.forEach((t) => es.removeEventListener(t, handler as EventListener));
      es.close();
      esRef.current = null;
    };
  }, [enabled, subjects?.join(","), workflowId, conversationId, bufferSize]);

  const clear = () => setEvents([]);
  return { events, status, clear };
}
