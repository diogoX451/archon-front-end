import { useQuery } from "@tanstack/react-query";
import { listMCPConfigs, type MCPConfig } from "@shared/api/mcpConfig";

/**
 * useMCPConfigs lists registered MCP servers for the given tenant.
 *
 * Used by the workflow builder's Inspector to populate the MCP-name
 * dropdown so users pick from real registry entries instead of typing
 * a slug that might not exist. The query stays disabled until a tenant
 * slug is known — super-admins without a tenant context get an empty
 * list rather than a 403 spam.
 *
 * The TanStack default TTL is fine here: MCP configs change rarely and
 * any new entry shows up after the next builder mount.
 */
export const useMCPConfigs = (
  tenantSlug?: string,
  options?: { enabled?: boolean },
) =>
  useQuery<MCPConfig[]>({
    queryKey: ["mcp-configs", tenantSlug ?? "(self)"],
    queryFn: () => listMCPConfigs(tenantSlug),
    // Gated by the explicit `enabled` flag when provided so callers (like
    // the workflow Inspector) can avoid firing the request unless the
    // currently-selected agent actually needs MCP metadata. The empty
    // string check still wins so super-admins without a selected tenant
    // don't trigger a 403.
    enabled: (options?.enabled ?? true) && tenantSlug !== "",
  });
