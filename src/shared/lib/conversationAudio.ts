import type { WorkflowEvent } from "@shared/api/events";
import type { RiskRecord } from "@shared/api/risk";

interface TranscribedPayload {
  transcribed_at?: string;
  conversation_id?: string;
  audio_message_id?: string;
  model?: string;
  transcription?: string;
  audio_key?: string;
}

export interface ConversationAudioEntry {
  id: string;
  occurredAt?: string;
  conversationId: string;
  audioMessageId?: string;
  model?: string;
  transcription?: string;
  audioKey?: string;
  risks: RiskRecord[];
}

function when(value?: string): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

export function buildConversationAudioEntries(
  events: WorkflowEvent[],
  riskRecords: RiskRecord[],
  conversationId: string,
): ConversationAudioEntry[] {
  if (!conversationId) return [];

  return events
    .filter((ev) => ev.subject === "conversation.audio.transcribed")
    .map((ev) => ({ ev, payload: (ev.payload ?? {}) as TranscribedPayload }))
    .filter(({ ev, payload }) => (payload.conversation_id ?? ev.conversation_id ?? "") === conversationId)
    .map(({ ev, payload }) => {
      const exactMatches = riskRecords.filter((record) => {
        if (payload.audio_key && record.audio_key && record.audio_key === payload.audio_key) return true;
        if (payload.audio_message_id && record.audio_message_id && record.audio_message_id === payload.audio_message_id) return true;
        return false;
      });
      const fallbackMatches = exactMatches.length
        ? exactMatches
        : riskRecords.filter((record) => record.conversation_id === conversationId);

      return {
        id: ev.id ?? payload.audio_message_id ?? payload.audio_key ?? `${conversationId}-${ev.occurred_at ?? ""}`,
        occurredAt: payload.transcribed_at ?? ev.occurred_at,
        conversationId,
        audioMessageId: payload.audio_message_id,
        model: payload.model,
        transcription: payload.transcription,
        audioKey: payload.audio_key,
        risks: [...fallbackMatches].sort((a, b) => when(b.created_at) - when(a.created_at)),
      };
    })
    .sort((a, b) => when(b.occurredAt) - when(a.occurredAt));
}
