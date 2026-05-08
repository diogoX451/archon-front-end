import { useState } from "react";
import { api } from "@shared/lib/api/client";
import type { Json } from "@shared/lib/api/client";
import { Card } from "@shared/ui/Card";
import { JsonBlock } from "@shared/ui/JsonBlock";
import { asErrorMessage } from "@shared/lib/utils/state";

export function WorkflowResultPage() {
  const [workflowId, setWorkflowId] = useState("wf-msg-002");
  const [data, setData] = useState<Json | null>(null);
  const [error, setError] = useState("");

  async function fetchResult() {
    try {
      setError("");
      setData(await api.getWorkflowResult(workflowId));
    } catch (err) {
      setError(asErrorMessage(err));
    }
  }

  return (
    <div className="stack">
      <h2>Workflow Result</h2>
      <Card>
        <input value={workflowId} onChange={(e) => setWorkflowId(e.target.value)} placeholder="workflow id" />
        <button onClick={fetchResult}>Consultar result</button>
        {error && <p className="error">{error}</p>}
      </Card>
      {data !== null && (
        <Card>
          <JsonBlock value={data} />
        </Card>
      )}
    </div>
  );
}
