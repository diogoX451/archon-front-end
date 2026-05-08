import { useState } from "react";
import { useGetWorkflowResult } from "@shared/hooks/useWorkflows";

export function WorkflowResultPage() {
  const [workflowId, setWorkflowId] = useState("wf-msg-002");
  const [searchId, setSearchId] = useState("");

  const { data, error, isLoading, refetch } = useGetWorkflowResult(searchId, {
    enabled: !!searchId,
  });

  function handleSearch() {
    setSearchId(workflowId);
  }

  return (
    <>
      <div className="page-topbar">
        <span className="page-title">Workflow Result</span>
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">Consultar resultado</span>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Resultado do Workflow</h1>
        <p className="page-lead">
          Consulte o resultado de um workflow pelo ID. O status será exibido junto com o payload de saída quando disponível.
        </p>

        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="search-input"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              placeholder="workflow id"
              style={{ flex: 1 }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button className="btn primary" onClick={handleSearch} disabled={isLoading}>
              {isLoading ? "Consultando…" : "Consultar result"}
            </button>
          </div>
          {error && (
            <p style={{ color: "var(--err)", marginTop: 12, fontSize: 13 }}>
              {error.message}
            </p>
          )}
        </div>

        {data && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>Status:</span>
              <span
                className="pill"
                data-tone={data.status === "completed" ? "ok" : data.status === "failed" ? "err" : "run"}
              >
                <span className="dot"></span>{data.status}
              </span>
              {data.finished_at && (
                <span className="muted" style={{ fontSize: 12 }}>
                  Finalizado em: {new Date(data.finished_at).toLocaleString("pt-BR")}
                </span>
              )}
            </div>
            {data.output && (
              <pre
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-2)",
                  padding: 16,
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  overflow: "auto",
                  maxHeight: 400,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {JSON.stringify(data.output, null, 2)}
              </pre>
            )}
            {data.error && (
              <p style={{ color: "var(--err)", marginTop: 12 }}>{data.error}</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
