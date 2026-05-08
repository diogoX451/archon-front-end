import { fetchClient } from "./client";

export interface AgentTemplate {
  id: string;
  type: string;
  label: string;
  category: string;
  description?: string;
  need_type?: string;
  glyph?: string;
  ports: { principal?: string[]; auxiliary?: string[] };
  default_config: Record<string, unknown>;
}

export const listAgentTemplates = () =>
  fetchClient<AgentTemplate[]>("/api/v1/agents/templates");
