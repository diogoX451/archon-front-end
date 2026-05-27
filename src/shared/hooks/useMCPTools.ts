import { useQuery } from "@tanstack/react-query";
import { listMCPTools, type MCPTool } from "@shared/api/mcpConfig";

export const useMCPTools = (
  configID?: string,
  subject?: string,
  options?: { enabled?: boolean },
) =>
  useQuery<MCPTool[]>({
    queryKey: ["mcp-tools", configID, subject ?? ""],
    queryFn: () => listMCPTools(configID!, subject),
    enabled: (options?.enabled ?? true) && !!configID,
    staleTime: 60_000,
  });
