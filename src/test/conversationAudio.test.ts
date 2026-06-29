import { describe, expect, it } from "vitest";

import { buildConversationAudioEntries } from "../shared/lib/conversationAudio";
import type { WorkflowEvent } from "../shared/api/events";
import type { RiskRecord } from "../shared/api/risk";

function makeRisk(overrides: Partial<RiskRecord>): RiskRecord {
  return {
    id: overrides.id ?? "risk-1",
    tenant_id: overrides.tenant_id ?? "tenant-1",
    conversation_id: overrides.conversation_id ?? "conv-1",
    audio_message_id: overrides.audio_message_id,
    audio_key: overrides.audio_key,
    model: overrides.model,
    review_status: overrides.review_status ?? "pending",
    created_at: overrides.created_at ?? "2026-06-29T12:00:00Z",
    event_id: overrides.event_id,
    classification: overrides.classification ?? {
      overall_severity: "high",
      summary: "Risco detectado",
      findings: [],
    },
  };
}

describe("buildConversationAudioEntries", () => {
  it("keeps only transcriptions from the active conversation and sorts newest first", () => {
    const events: WorkflowEvent[] = [
      {
        subject: "conversation.audio.transcribed",
        event_type: "audio",
        conversation_id: "conv-1",
        payload: { conversation_id: "conv-1", transcription: "primeira" },
        occurred_at: "2026-06-29T10:00:00Z",
      },
      {
        subject: "conversation.audio.transcribed",
        event_type: "audio",
        conversation_id: "conv-2",
        payload: { conversation_id: "conv-2", transcription: "outra conversa" },
        occurred_at: "2026-06-29T11:00:00Z",
      },
      {
        subject: "conversation.audio.transcribed",
        event_type: "audio",
        conversation_id: "conv-1",
        payload: { conversation_id: "conv-1", transcription: "mais recente" },
        occurred_at: "2026-06-29T12:00:00Z",
      },
    ];

    const entries = buildConversationAudioEntries(events, [], "conv-1");

    expect(entries).toHaveLength(2);
    expect(entries[0].transcription).toBe("mais recente");
    expect(entries[1].transcription).toBe("primeira");
  });

  it("prefers exact risk matches by audio key over broad conversation fallback", () => {
    const events: WorkflowEvent[] = [{
      id: "ev-1",
      subject: "conversation.audio.transcribed",
      event_type: "audio",
      conversation_id: "conv-1",
      payload: {
        conversation_id: "conv-1",
        audio_key: "audio/tenant-1/file-a.wav",
        transcription: "texto",
      },
      occurred_at: "2026-06-29T10:00:00Z",
    }];
    const risks: RiskRecord[] = [
      makeRisk({
        id: "risk-exact",
        audio_key: "audio/tenant-1/file-a.wav",
        created_at: "2026-06-29T12:00:00Z",
      }),
      makeRisk({
        id: "risk-fallback",
        audio_key: "audio/tenant-1/file-b.wav",
        created_at: "2026-06-29T13:00:00Z",
      }),
    ];

    const entries = buildConversationAudioEntries(events, risks, "conv-1");

    expect(entries[0].risks.map((risk) => risk.id)).toEqual(["risk-exact"]);
  });

  it("falls back to conversation-level risks when the transcription lacks audio identifiers", () => {
    const events: WorkflowEvent[] = [{
      subject: "conversation.audio.transcribed",
      event_type: "audio",
      conversation_id: "conv-1",
      payload: {
        conversation_id: "conv-1",
        transcription: "sem chave",
      },
      occurred_at: "2026-06-29T10:00:00Z",
    }];
    const risks: RiskRecord[] = [
      makeRisk({ id: "risk-1", conversation_id: "conv-1", created_at: "2026-06-29T12:00:00Z" }),
      makeRisk({ id: "risk-2", conversation_id: "conv-1", created_at: "2026-06-29T13:00:00Z" }),
    ];

    const entries = buildConversationAudioEntries(events, risks, "conv-1");

    expect(entries[0].risks.map((risk) => risk.id)).toEqual(["risk-2", "risk-1"]);
  });
});
