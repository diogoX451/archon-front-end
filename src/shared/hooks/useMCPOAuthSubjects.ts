import { useQuery } from "@tanstack/react-query";
import { listMCPOAuthSubjects, type OAuthSubjectStatus } from "@shared/api/mcpConfig";

/**
 * useMCPOAuthSubjects fetches the list of connected OAuth accounts for an MCP
 * server. Used by the workflow builder's MCPActionFields to show a subject
 * dropdown instead of a free-text input, and to hint when auto-resolution is
 * possible (single connected account).
 */
export const useMCPOAuthSubjects = (
  configID?: string,
  options?: { enabled?: boolean },
) =>
  useQuery<OAuthSubjectStatus[]>({
    queryKey: ["mcp-oauth-subjects", configID ?? ""],
    queryFn: () => listMCPOAuthSubjects(configID!),
    enabled: (options?.enabled ?? true) && !!configID,
    staleTime: 30_000,
  });
