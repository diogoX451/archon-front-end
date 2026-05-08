import { useQuery } from "@tanstack/react-query";
import { listAgentTemplates } from "@shared/api/agents";

export const useAgentTemplates = () =>
  useQuery({
    queryKey: ["agent-templates"],
    queryFn: listAgentTemplates,
    staleTime: 5 * 60_000,
  });
