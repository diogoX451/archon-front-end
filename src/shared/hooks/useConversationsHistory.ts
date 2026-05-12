import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteConversation,
  editConversationTurn,
  getConversation,
  listConversationTurns,
  listConversations,
  regenerateConversationTurn,
  type ConversationsPage,
} from "@shared/api/conversationsHistory";

export const conversationsKeys = {
  all: ["conversations"] as const,
  list: (tenantSlug?: string) => [...conversationsKeys.all, "list", tenantSlug || "all"] as const,
  detail: (id: string) => [...conversationsKeys.all, "detail", id] as const,
  turns: (id: string) => [...conversationsKeys.all, "turns", id] as const,
};

export const useConversationsList = (
  tenantSlug?: string,
  options?: { enabled?: boolean; refetchInterval?: number | false; limit?: number }
) =>
  useQuery<ConversationsPage>({
    queryKey: conversationsKeys.list(tenantSlug),
    queryFn: () => listConversations({ tenantSlug, limit: options?.limit }),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });

export const useConversation = (id: string, tenantSlug?: string, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: conversationsKeys.detail(id),
    queryFn: () => getConversation(id, tenantSlug),
    enabled: !!id && (options?.enabled ?? true),
  });

export const useConversationTurns = (
  id: string,
  tenantSlug?: string,
  options?: { enabled?: boolean; refetchInterval?: number | false }
) =>
  useQuery({
    queryKey: conversationsKeys.turns(id),
    queryFn: () => listConversationTurns(id, { tenantSlug }),
    enabled: !!id && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval,
  });

export const useDeleteConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; tenantSlug?: string }) => deleteConversation(args.id, args.tenantSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: conversationsKeys.all });
    },
  });
};

export const useEditConversationTurn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { conversationId: string; turnId: string; content: string; tenantSlug?: string }) =>
      editConversationTurn(args.conversationId, args.turnId, args.content, args.tenantSlug),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: conversationsKeys.turns(vars.conversationId) });
    },
  });
};

export const useRegenerateConversationTurn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { conversationId: string; turnId: string; profileId?: string; tenantSlug?: string }) =>
      regenerateConversationTurn(args.conversationId, args.turnId, args.profileId, args.tenantSlug),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: conversationsKeys.turns(vars.conversationId) });
    },
  });
};
