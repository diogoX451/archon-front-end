import { useEffect, useState } from "react";
import type { WorkflowState } from "@shared/api/types";
import { withApiBase } from "@shared/api/client";
import { getToken } from "@shared/api/token";

type SSEStatus = "idle" | "connecting" | "open" | "terminal" | "error";

/**
 * Subscribes to `GET /workflows/{id}/events` SSE stream. Returns the latest
 * state snapshot delivered by the server plus a status flag. Reconnect logic
 * stays minimal: terminal events stop the stream cleanly; transient errors
 * fall back to a stale snapshot (caller can still poll via the regular hook).
 *
 * EventSource doesn't support headers — auth token rides in the URL as a
 * fallback query string when present (server reads either Authorization or
 * ?token=). For sessions where cookies/cors are used, that param is a no-op.
 */
export function useWorkflowEventsSSE(workflowId: string, enabled = true) {
  const [state, setState] = useState<WorkflowState | null>(null);
  const [status, setStatus] = useState<SSEStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !workflowId) {
      setStatus("idle");
      return;
    }

    const token = getToken();
    const params = token ? `?token=${encodeURIComponent(token)}` : "";
    const url = withApiBase(`/api/v1/workflows/${encodeURIComponent(workflowId)}/events${params}`);
    setStatus("connecting");
    setError(null);

    const es = new EventSource(url, { withCredentials: true });

    const onState = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as WorkflowState;
        setState(data);
        setStatus("open");
      } catch {
        /* ignore parse */
      }
    };

    const onDone = () => {
      setStatus("terminal");
      es.close();
    };

    const onError = (ev: MessageEvent) => {
      try {
        const data = ev.data ? JSON.parse(ev.data) : {};
        if (data?.error) setError(data.error);
      } catch {
        /* ignore */
      }
    };

    es.addEventListener("state", onState);
    es.addEventListener("done", onDone);
    es.addEventListener("error", onError);

    es.onerror = () => {
      setStatus((prev) => (prev === "terminal" ? prev : "error"));
    };

    return () => {
      es.removeEventListener("state", onState);
      es.removeEventListener("done", onDone);
      es.removeEventListener("error", onError);
      es.close();
    };
  }, [workflowId, enabled]);

  return { state, status, error };
}
