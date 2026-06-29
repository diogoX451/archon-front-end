import { useQuery } from "@tanstack/react-query";
import { getConversationTimeline, getWorkflowTimeline } from "@shared/api/events";

export const timelineKeys = {
  all: ["timeline"] as const,
  workflow: (id: string) => [...timelineKeys.all, "workflow", id] as const,
  conversation: (id: string) => [...timelineKeys.all, "conversation", id] as const,
};

export const useWorkflowTimeline = (workflowId: string, options?: { enabled?: boolean; limit?: number; refetchInterval?: number | false }) =>
  useQuery({
    queryKey: timelineKeys.workflow(workflowId),
    queryFn: () => getWorkflowTimeline(workflowId, options?.limit ?? 500),
    enabled: options?.enabled !== false && !!workflowId,
    refetchInterval: options?.refetchInterval,
  });

export const useConversationTimeline = (conversationId: string, options?: { enabled?: boolean; limit?: number; refetchInterval?: number | false }) =>
  useQuery({
    queryKey: timelineKeys.conversation(conversationId),
    queryFn: () => getConversationTimeline(conversationId, options?.limit ?? 500),
    enabled: options?.enabled !== false && !!conversationId,
    refetchInterval: options?.refetchInterval,
  });
