export type AgentStatus = "idle" | "running" | "done" | "error";
export type ConnectionStatus = "idle" | "active" | "done";

export type AgentNodeData = {
  id: string;
  type: string;
  x: number;
  y: number;
  status: AgentStatus;
  config: Record<string, any>;
};

export type PortRef = {
  agent: string;
  port: string;
  kind?: "principal" | "auxiliary";
};

export type ConnectionData = {
  id: string;
  from: PortRef;
  to: PortRef;
  status: ConnectionStatus;
};

export type WorkflowData = {
  name: string;
  agents: AgentNodeData[];
  connections: ConnectionData[];
};

export type SelectedEntity = {
  kind: "agent" | "connection" | "ghost" | null;
  id: string | null;
};
