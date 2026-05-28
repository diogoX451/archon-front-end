import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { IconPlus } from "@shared/ui/icons/Icons";
import { TimelineDrawer } from "@shared/ui/TimelineDrawer";
import { useListConversationProfiles, useCreateConversationTurn } from "@shared/hooks/useConversation";
import { useGetWorkflowResult, useGetWorkflowStatus } from "@shared/hooks/useWorkflows";
import {
  conversationsKeys,
  useConversationTurns,
  useConversationsList,
  useDeleteConversation,
  useEditConversationTurn,
  useRegenerateConversationTurn,
} from "@shared/hooks/useConversationsHistory";
import type { ConversationTurnRow } from "@shared/api/conversationsHistory";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useConfirm } from "@shared/ui/feedback";
import { useAuth } from "@app/auth-context";
import { canAny } from "@shared/authz";
import { useEventStream } from "@shared/hooks/useEventStream";
import { useGraphProfile } from "@shared/hooks/useGraphProfile";
import type { UserGraphProfile, GraphProfileHookEdge } from "@shared/api/graphProfile";

function extractAssistantText(output: any): string {
  if (output == null) return "";
  if (typeof output === "string") return output;
  const candidates = [
    output?.input?.text,
    output?.text,
    output?.decision?.input?.text,
    output?.message?.text,
    output?.reply,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c;
  }
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

function AssistantMessageContent({ text, onOptionClick }: { text: string; onOptionClick?: (opt: string) => void }) {
  let parsed: any = null;
  if (text.trimStart().startsWith("{") || text.trimStart().startsWith("[")) {
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }
  }

  if (parsed && parsed.decision) {
    const { action, thought, input } = parsed.decision ?? {};
    const options: string[] = Array.isArray(input?.options) ? input.options : [];

    const actionLabel: Record<string, string> = {
      clarify_intent: "Esclarecimento necessário",
      respond: "Resposta",
      escalate: "Escalado",
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {action && (
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            opacity: 0.6,
          }}>
            {actionLabel[action] ?? action}
          </span>
        )}
        {thought && <span style={{ lineHeight: 1.5 }}>{thought}</span>}
        {options.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onOptionClick?.(opt)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 99,
                  border: "1px solid currentColor",
                  background: "transparent",
                  color: "inherit",
                  opacity: 0.75,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: onOptionClick ? "pointer" : "default",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => { if (onOptionClick) (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.75"; }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (parsed !== null) {
    return (
      <details style={{ fontSize: 12 }}>
        <summary style={{ cursor: "pointer", opacity: 0.7, userSelect: "none" }}>
          Ver resposta estruturada
        </summary>
        <pre style={{
          marginTop: 8,
          padding: 10,
          borderRadius: 6,
          background: "rgba(0,0,0,0.08)",
          overflowX: "auto",
          fontSize: 11,
          lineHeight: 1.5,
        }}>
          {JSON.stringify(parsed, null, 2)}
        </pre>
      </details>
    );
  }

  return <>{text}</>;
}

function TurnResolver({
  workflowId,
  conversationId,
  onSettled,
}: {
  workflowId: string;
  conversationId: string;
  onSettled: () => void;
}) {
  const qc = useQueryClient();
  const [done, setDone] = useState(false);

  const { data: status } = useGetWorkflowStatus(workflowId, {
    enabled: !done,
    refetchInterval: done ? false : 2000,
  });
  const isTerminal = status?.status === "completed" || status?.status === "failed";
  const { data: result } = useGetWorkflowResult(workflowId, {
    enabled: !done && isTerminal,
  });

  useEffect(() => {
    if (done || !result) return;
    setDone(true);
    qc.invalidateQueries({ queryKey: conversationsKeys.turns(conversationId) });
    onSettled();
  }, [result, done, qc, conversationId, onSettled]);

  return null;
}

const JOURNEY_LABELS: Record<string, string> = {
  awareness: "Descoberta",
  consideration: "Consideração",
  evaluation: "Avaliação",
  decision: "Decisão",
  retention: "Retenção",
};

const TECH_LABELS: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

function UserProfilePanel({
  profile,
  isLoading,
  is503,
}: {
  profile?: UserGraphProfile;
  isLoading: boolean;
  is503: boolean;
}) {
  if (is503) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: "var(--ink-3)", textAlign: "center" }}>
        <div style={{ marginBottom: 6 }}>Graph Memory não configurado.</div>
        <div style={{ fontSize: 11 }}>Neo4j ausente no servidor.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: "var(--ink-3)", textAlign: "center" }}>
        Carregando perfil…
      </div>
    );
  }

  if (!profile) return null;

  const { user_profile, preferences, recent_intents, recent_decisions, current_task, hooks, hook_edges } = profile;
  const hasAnyData =
    user_profile?.name ||
    preferences.length > 0 ||
    recent_intents.length > 0 ||
    recent_decisions.length > 0 ||
    current_task ||
    hook_edges.length > 0;

  if (!hasAnyData) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: "var(--ink-3)", textAlign: "center" }}>
        <div style={{ fontSize: 24, opacity: 0.3, marginBottom: 8 }}>🧠</div>
        Nenhuma memória acumulada ainda para este contato.
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14, fontSize: 12 }}>
      {/* Identity */}
      {(user_profile?.name || user_profile?.tech_level || user_profile?.tone || user_profile?.journey_stage) && (
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-4)", fontWeight: 600, marginBottom: 6 }}>
            Identidade
          </div>
          {user_profile.name && (
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>{user_profile.name}</div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {user_profile.tech_level && (
              <span style={pillStyle("var(--surface-2)", "var(--ink-3)")}>
                {TECH_LABELS[user_profile.tech_level] ?? user_profile.tech_level}
              </span>
            )}
            {user_profile.tone && (
              <span style={pillStyle("var(--surface-2)", "var(--ink-3)")}>{user_profile.tone}</span>
            )}
            {user_profile.journey_stage && (
              <span style={pillStyle("oklch(0.92 0.04 250)", "oklch(0.45 0.12 250)")}>
                {JOURNEY_LABELS[user_profile.journey_stage] ?? user_profile.journey_stage}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Current task */}
      {current_task && (
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-4)", fontWeight: 600, marginBottom: 6 }}>
            Tarefa atual
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: current_task.status === "in_progress" ? "#22c55e" : "var(--ink-4)",
            }} />
            <span style={{ color: "var(--ink-2)" }}>{current_task.name}</span>
            <span style={{ color: "var(--ink-4)", marginLeft: "auto" }}>{current_task.status}</span>
          </div>
        </div>
      )}

      {/* Recent intents */}
      {recent_intents.length > 0 && (
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-4)", fontWeight: 600, marginBottom: 6 }}>
            Intenções recentes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recent_intents.slice(0, 4).map((intent, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ flex: 1, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {intent.name}
                </span>
                <span style={{ color: "var(--ink-4)", fontFamily: "var(--font-mono)", fontSize: 11, flexShrink: 0 }}>
                  {Math.round(intent.confidence * 100)}%
                </span>
                <div style={{ width: 36, height: 3, background: "var(--line)", borderRadius: 2, flexShrink: 0, overflow: "hidden" }}>
                  <div style={{ width: `${intent.confidence * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preferences */}
      {preferences.length > 0 && (
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-4)", fontWeight: 600, marginBottom: 6 }}>
            Preferências
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {preferences.slice(0, 5).map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                <span style={{ color: "var(--ink-3)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {p.key}
                </span>
                <span style={{ color: "var(--ink)", flexShrink: 0 }}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent decisions */}
      {recent_decisions.length > 0 && (
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-4)", fontWeight: 600, marginBottom: 6 }}>
            Decisões recentes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recent_decisions.slice(0, 3).map((d, i) => (
              <div key={i} style={{ color: "var(--ink-2)", lineHeight: 1.4 }}>
                {d.text}
                {d.domain && <span style={{ color: "var(--ink-4)", marginLeft: 4 }}>· {d.domain}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hooks */}
      {hooks.length > 0 && (
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-4)", fontWeight: 600, marginBottom: 6 }}>
            Instruções ativas
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {hooks.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }}>›</span>
                <span style={{ color: "var(--ink-3)", lineHeight: 1.4 }}>{h}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hook edges (scheduled events, etc.) */}
      {hook_edges.length > 0 && (
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-4)", fontWeight: 600, marginBottom: 6 }}>
            Atividades
          </div>
          {Object.entries(
            hook_edges.reduce<Record<string, string[]>>((acc, e) => {
              if (!e.relation || !e.target) return acc;
              (acc[e.relation] ??= []).push(e.target);
              return acc;
            }, {})
          ).map(([rel, targets]) => (
            <div key={rel} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: "var(--ink-4)", marginBottom: 3 }}>{rel}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {targets.map((t, i) => (
                  <span key={i} style={hookEdgePillStyle(rel)}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function pillStyle(bg: string, color: string): React.CSSProperties {
  return {
    background: bg,
    color,
    borderRadius: 10,
    padding: "2px 8px",
    fontSize: 11,
    border: "1px solid var(--line)",
  };
}

function hookEdgePillStyle(relation: string): React.CSSProperties {
  let bg = "var(--surface-2)";
  let color = "var(--ink-3)";
  if (relation === "SCHEDULED") { bg = "oklch(0.92 0.04 140)"; color = "oklch(0.40 0.12 140)"; }
  else if (relation === "CANCELLED") { bg = "oklch(0.95 0.02 15)"; color = "oklch(0.50 0.12 15)"; }
  return { background: bg, color, borderRadius: 10, padding: "2px 8px", fontSize: 11, border: "1px solid var(--line)" };
}

function isConfirmedByServer(optimistic: ConversationTurnRow, serverTurns: ConversationTurnRow[]) {
  const optimisticTime = Date.parse(optimistic.created_at);
  return serverTurns.some((turn) => {
    if (turn.id.startsWith("opt_")) return false;
    if (turn.role !== optimistic.role || turn.content !== optimistic.content) return false;
    if (!Number.isFinite(optimisticTime)) return true;
    const turnTime = Date.parse(turn.created_at);
    return !Number.isFinite(turnTime) || turnTime >= optimisticTime - 30_000;
  });
}

function mergeConversationTurns(serverTurns: ConversationTurnRow[], optimisticTurns: ConversationTurnRow[]) {
  const unresolvedOptimistic = optimisticTurns.filter((turn) => !isConfirmedByServer(turn, serverTurns));
  return [...serverTurns, ...unresolvedOptimistic].sort((a, b) => {
    const aTime = Date.parse(a.created_at);
    const bTime = Date.parse(b.created_at);
    if (!Number.isFinite(aTime) || !Number.isFinite(bTime) || aTime === bTime) return 0;
    return aTime - bTime;
  });
}

export function ConversationPage() {
  const { isSuper, hasPermission } = useAuth();
  const canUseConversation = canAny({ isSuper, hasPermission }, ["conversation_turn"]);
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetProfile = searchParams.get("profile") || "";
  const initialConvId = searchParams.get("conv") || "";

  const [activeConvId, setActiveConvId] = useState<string>(initialConvId);
  const [draft, setDraft] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(presetProfile);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [convSearch, setConvSearch] = useState("");
  const [optimisticTurnsByConv, setOptimisticTurnsByConv] = useState<Record<string, ConversationTurnRow[]>>({});

  const { data: profiles, isLoading: profilesLoading, error: profilesError } = useListConversationProfiles();
  const createTurn = useCreateConversationTurn();
  const { data: convsPage, isLoading: convsLoading } = useConversationsList(undefined, { limit: 50 });
  const allConversations = convsPage?.items || [];
  const conversations = useMemo(() => {
    if (!convSearch.trim()) return allConversations;
    const q = convSearch.toLowerCase();
    return allConversations.filter(
      (c) =>
        c.conversation_id.toLowerCase().includes(q) ||
        c.profile_id.toLowerCase().includes(q) ||
        (c.preview || "").toLowerCase().includes(q) ||
        (c.user_id || "").toLowerCase().includes(q)
    );
  }, [allConversations, convSearch]);
  const deleteConv = useDeleteConversation();
  const editTurn = useEditConversationTurn();
  const regenerateTurn = useRegenerateConversationTurn();
  const qc = useQueryClient();

  const turnsQuery = useConversationTurns(activeConvId, undefined, { enabled: !!activeConvId });
  const serverTurns = turnsQuery.data?.turns || [];
  const optimisticTurns = activeConvId ? optimisticTurnsByConv[activeConvId] || [] : [];
  const turns = useMemo(
    () => mergeConversationTurns(serverTurns, optimisticTurns),
    [serverTurns, optimisticTurns]
  );
  const activeMeta = turnsQuery.data?.conversation;

  const userId = activeMeta?.user_id;
  const { data: graphProfile, isLoading: profileLoading, error: profileError } = useGraphProfile(
    userId,
    { enabled: !!userId && profilePanelOpen }
  );
  const is503 = (profileError as any)?.status === 503;

  // SSE: listen for result/conversation_turn events on the active conversation
  // and invalidate turns cache so messages appear without waiting for the next poll.
  const { events: sseEvents } = useEventStream({
    conversationId: activeConvId,
    enabled: !!activeConvId,
  });
  const lastSseKeyRef = useRef("");
  useEffect(() => {
    if (!sseEvents.length || !activeConvId) return;
    const latest = sseEvents[sseEvents.length - 1];
    const key = `${latest.event_type}_${latest.occurred_at}_${latest.correlation_id}`;
    if (key === lastSseKeyRef.current) return;
    lastSseKeyRef.current = key;
    if (latest.event_type === "result" || latest.event_type === "conversation_turn") {
      qc.invalidateQueries({ queryKey: conversationsKeys.turns(activeConvId) });
    }
  }, [sseEvents, activeConvId, qc]);

  // Auto-scroll chat to bottom when new messages arrive
  const chatMsgsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatMsgsRef.current) {
      chatMsgsRef.current.scrollTop = chatMsgsRef.current.scrollHeight;
    }
  }, [turns.length]);

  useEffect(() => {
    if (!activeConvId) return;
    setOptimisticTurnsByConv((prev) => {
      const pending = prev[activeConvId];
      if (!pending?.length) return prev;
      const nextPending = pending.filter((turn) => !isConfirmedByServer(turn, serverTurns));
      if (nextPending.length === pending.length) return prev;
      const next = { ...prev };
      if (nextPending.length) next[activeConvId] = nextPending;
      else delete next[activeConvId];
      return next;
    });
  }, [activeConvId, serverTurns]);

  const pendingWorkflowIds = useMemo(
    () => turns.filter((t) => t.status === "pending" && t.workflow_id).map((t) => t.workflow_id!),
    [turns]
  );

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (activeConvId) {
      if (next.get("conv") !== activeConvId) {
        next.set("conv", activeConvId);
        setSearchParams(next, { replace: true });
      }
    }
  }, [activeConvId, searchParams, setSearchParams]);

  useEffect(() => {
    if (activeMeta?.profile_id) setSelectedProfile(activeMeta.profile_id);
  }, [activeMeta?.profile_id]);

  useEffect(() => {
    if (presetProfile && !activeConvId) setSelectedProfile(presetProfile);
  }, [presetProfile, activeConvId]);

  const handleSettled = useCallback(() => {
    qc.invalidateQueries({ queryKey: conversationsKeys.list() });
  }, [qc]);

  const startConversation = () => {
    if (!selectedProfile) {
      alert("Selecione um profile antes.");
      return;
    }
    const id = `conv_${Date.now().toString(36)}`;
    setActiveConvId(id);
    qc.setQueryData(conversationsKeys.turns(id), { conversation: null, turns: [] });
  };

  const sendMessage = (overrideText?: string) => {
    const text = (overrideText ?? draft).trim();
    if (!text || !selectedProfile) return;
    if (!overrideText) setDraft("");
    let convId = activeConvId;
    if (!convId) {
      convId = `conv_${Date.now().toString(36)}`;
      setActiveConvId(convId);
    }

    const history = serverTurns
      .filter((t) => t.status === "ok")
      .map((t) => ({ role: t.role, content: t.content }));

    // Keep outgoing messages visible while SSE/refetch races with persistence.
    const tempId = `opt_${Date.now()}`;
    const optimistic: ConversationTurnRow = {
      id: tempId,
      conversation_pk: "",
      conversation_id: convId,
      role: "user",
      content: text,
      status: "ok",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setOptimisticTurnsByConv((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] || []), optimistic],
    }));
    qc.setQueryData(conversationsKeys.turns(convId), (prev: any) => ({
      ...prev,
      conversation:
        prev?.conversation || {
          conversation_id: convId,
          profile_id: selectedProfile,
          message_count: (prev?.turns || []).length + 1,
        },
      turns: prev?.turns || [],
    }));

    const removeOptimisticTurn = () => {
      setOptimisticTurnsByConv((prev) => {
        const pending = prev[convId];
        if (!pending?.length) return prev;
        const nextPending = pending.filter((turn) => turn.id !== tempId);
        const next = { ...prev };
        if (nextPending.length) next[convId] = nextPending;
        else delete next[convId];
        return next;
      });
    };

    const removeOptimisticTurnIfConfirmed = (responseTurns: ConversationTurnRow[]) => {
      if (!isConfirmedByServer(optimistic, responseTurns)) return;
      removeOptimisticTurn();
    };

    createTurn.mutate(
      {
        profile_id: selectedProfile,
        conversation_id: convId,
        message: text,
        history: history.length > 0 ? history : undefined,
      },
      {
        onSuccess: (response: any) => {
          const responseTurns = ((response?.turns || []) as ConversationTurnRow[]).filter(
            (turn) => !turn.id.startsWith("opt_")
          );
          removeOptimisticTurnIfConfirmed(responseTurns);
          qc.setQueryData(conversationsKeys.turns(convId), (prev: any) => {
            const existing = ((prev?.turns || []) as ConversationTurnRow[]).filter((t) => !t.id.startsWith("opt_"));
            const seen = new Set(existing.map((t) => t.id));
            const merged = [...existing];
            for (const t of responseTurns) {
              if (!seen.has(t.id)) merged.push(t);
            }
            return {
              ...prev,
              conversation: prev?.conversation || {
                conversation_id: convId,
                profile_id: response.profile_id,
                message_count: merged.length,
              },
              turns: merged,
            };
          });
          qc.invalidateQueries({ queryKey: conversationsKeys.list() });
        },
        onError: (err: any) => {
          removeOptimisticTurn();
          alert(`Erro: ${err?.message || "falhou"}`);
        },
      }
    );
  };

  const handleEditMessage = (turn: ConversationTurnRow) => {
    const next = window.prompt("Editar mensagem:", turn.content);
    if (next == null || next.trim() === "" || next === turn.content) return;
    editTurn.mutate({
      conversationId: activeConvId,
      turnId: turn.id,
      content: next,
    });
  };

  const handleRegenerate = async (turn: ConversationTurnRow) => {
    const ok = await confirm({
      title: "Regenerar resposta",
      message: "O turno atual será reprocessado a partir do mesmo prompt. O conteúdo anterior será sobrescrito.",
      confirmLabel: "Regenerar",
    });
    if (!ok) return;
    regenerateTurn.mutate({
      conversationId: activeConvId,
      turnId: turn.id,
      profileId: activeMeta?.profile_id || selectedProfile,
    });
  };

  const handleDelete = async (convId: string) => {
    const ok = await confirm({
      title: "Excluir conversa",
      message: "Tem certeza que quer excluir esta conversa? Todos os turnos serão removidos.",
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;
    deleteConv.mutate(
      { id: convId },
      {
        onSuccess: () => {
          if (activeConvId === convId) setActiveConvId("");
        },
      }
    );
  };

  const activePending = turns.some((t) => t.status === "pending");
  const [timelineOpen, setTimelineOpen] = useState(false);

  const gridCols = profilePanelOpen && userId
    ? "280px 1fr 260px"
    : "280px 1fr";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .conv-layout { display: grid; grid-template-columns: ${gridCols}; gap: 16px; height: calc(100vh - 140px); }
        .conv-sidebar { border: 1px solid var(--line); border-radius: var(--r-2); background: var(--surface); overflow: hidden; display: flex; flex-direction: column; height: 100%; }
        .conv-search-wrap { padding: 8px 10px; border-bottom: 1px solid var(--line); }
        .conv-search { width: 100%; font-size: 12px; padding: 5px 8px; border: 1px solid var(--line); border-radius: var(--r-1); background: var(--surface-2); color: var(--ink); outline: none; box-sizing: border-box; }
        .conv-search:focus { border-color: var(--accent); }
        .conv-list { flex: 1; overflow-y: auto; }
        .conv-item { padding: 10px 12px; border-bottom: 1px solid var(--line); cursor: pointer; }
        .conv-item:hover { background: var(--surface-2); }
        .conv-item[data-active="true"] { background: var(--surface-2); border-left: 3px solid var(--accent); padding-left: 9px; }
        .chat-area { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: var(--r-2); background: var(--surface); min-width: 0; height: 100%; overflow: hidden; }
        .chat-msgs { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
        .chat-msg { max-width: 75%; padding: 10px 14px; border-radius: 12px; font-size: 13.5px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
        .chat-msg[data-role="user"] { background: var(--accent); color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
        .chat-msg[data-role="assistant"] { background: var(--surface-2); color: var(--ink); align-self: flex-start; border-bottom-left-radius: 4px; border: 1px solid var(--line); }
        .chat-msg[data-status="pending"] { opacity: 0.7; font-style: italic; }
        .chat-msg[data-status="failed"] { background: oklch(0.55 0.18 25 / 0.15); color: var(--err); }
        .chat-input-row { padding: 12px; border-top: 1px solid var(--line); display: flex; gap: 8px; align-items: flex-end; }
        .chat-input-row textarea { flex: 1; resize: none; min-height: 44px; max-height: 160px; }
        .chat-header { padding: 12px 16px; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .profile-panel { border: 1px solid var(--line); border-radius: var(--r-2); background: var(--surface); overflow: hidden; display: flex; flex-direction: column; }
        .profile-panel-header { padding: 10px 14px; border-bottom: 1px solid var(--line); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-4); display: flex; align-items: center; justify-content: space-between; }
        .profile-panel-body { flex: 1; overflow-y: auto; }
        .profile-uid { font-family: var(--font-mono); font-size: 10px; color: var(--ink-4); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
      `}} />

      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">{activeConvId || "selecione ou crie"}</span>
        <div style={{ flex: 1 }}></div>
        <select
          className="field-select"
          value={selectedProfile}
          onChange={(e) => setSelectedProfile(e.target.value)}
          style={{ maxWidth: 240 }}
        >
          <option value="">Profile…</option>
          {profiles?.map((p) => (
            <option key={p.id} value={p.id}>{p.id}</option>
          ))}
        </select>
        <button type="button" className="btn primary" onClick={startConversation} disabled={!canUseConversation}>
          <IconPlus size={14} /> Nova conversa
        </button>
      </div>

      <div className="page-body">
        {profilesError && (
          <div className="card" style={{ padding: 16, borderColor: "var(--err)", marginBottom: 16 }}>
            <span style={{ color: "var(--err)", fontSize: 13 }}>
              Erro ao carregar profiles: {profilesError.message}
            </span>
          </div>
        )}

        {(profilesLoading || convsLoading) && (
          <div style={{ textAlign: "center", padding: 20, color: "var(--ink-3)" }}>Carregando…</div>
        )}

        <div className="conv-layout">
          <aside className="conv-sidebar">
            <div className="chat-header" style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>
              Histórico ({conversations.length}{convSearch && allConversations.length !== conversations.length ? `/${allConversations.length}` : ""})
            </div>
            <div className="conv-search-wrap">
              <input
                className="conv-search"
                placeholder="Filtrar por ID, profile, preview…"
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                aria-label="Filtrar conversas"
              />
            </div>
            <div className="conv-list">
              {conversations.length === 0 && !convsLoading && (
                <div style={{ padding: 20, fontSize: 12, color: "var(--ink-3)", textAlign: "center" }}>
                  Nenhuma conversa ainda
                </div>
              )}
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className="conv-item"
                  data-active={c.conversation_id === activeConvId}
                  onClick={() => setActiveConvId(c.conversation_id)}
                >
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{c.conversation_id.slice(0, 18)}</span>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={(e) => { e.stopPropagation(); handleDelete(c.conversation_id); }}
                      style={{ padding: "2px 6px", fontSize: 10 }}
                      title="Excluir"
                    >×</button>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 2 }}>
                    {c.profile_id} · <span style={{ fontFamily: "var(--font-mono)" }}>{c.message_count}</span> msgs
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.preview || "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 2 }}>
                    {c.last_message_at ? new Date(c.last_message_at).toLocaleString("pt-BR") : new Date(c.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="chat-area">
            <div className="chat-header">
              {activeConvId ? (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>
                      {activeMeta?.profile_id || selectedProfile || "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                      {activeConvId}
                    </div>
                  </div>
                  {activePending && <span className="pill" data-tone="run"><span className="dot"></span>aguardando</span>}
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setTimelineOpen(true)}
                    title="Abrir trail de auditoria desta conversa"
                    style={{ fontSize: 12 }}
                  >
                    Auditoria
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setProfilePanelOpen((v) => !v)}
                    title={userId ? "Perfil do usuário" : "Conversa sem user_id — perfil indisponível"}
                    style={{ fontSize: 12, opacity: userId ? 1 : 0.45 }}
                    disabled={!userId}
                  >
                    {profilePanelOpen ? "Fechar perfil" : "Perfil"}
                  </button>
                </>
              ) : (
                <div style={{ color: "var(--ink-3)", fontSize: 13 }}>
                  Selecione uma conversa ou crie uma nova
                </div>
              )}
            </div>

            <div className="chat-msgs" ref={chatMsgsRef}>
              {!activeConvId && (
                <div style={{ textAlign: "center", margin: "auto", color: "var(--ink-3)", fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>💬</div>
                  <div>Escolha um profile no topo e clique "Nova conversa".</div>
                </div>
              )}
              {turns.map((t) => {
                const text = t.status === "pending" ? "…" : (t.content || extractAssistantText(t.output));
                const display = t.status === "failed" ? `❌ ${t.error || text}` : text;
                return (
                  <div key={t.id} className="chat-msg" data-role={t.role} data-status={t.status}>
                    {t.role === "assistant" ? <AssistantMessageContent text={display} onOptionClick={(opt) => sendMessage(opt)} /> : display}
                    <div style={{ marginTop: 6, fontSize: 10, opacity: 0.7, display: "flex", gap: 10 }}>
                      {t.role === "assistant" && t.workflow_id && t.status !== "pending" && (
                        <Link
                          to={`/workflows/result?id=${encodeURIComponent(t.workflow_id)}`}
                          style={{ color: "inherit", textDecoration: "underline" }}
                        >
                          Ver trace →
                        </Link>
                      )}
                      {t.role === "user" && t.status === "ok" && !t.id.startsWith("opt_") && (
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ padding: "0", fontSize: 10, color: "inherit", background: "transparent", border: "none", textDecoration: "underline", cursor: "pointer" }}
                          onClick={() => handleEditMessage(t)}
                        >
                          editar
                        </button>
                      )}
                      {t.role === "assistant" && t.status !== "pending" && (
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ padding: "0", fontSize: 10, color: "inherit", background: "transparent", border: "none", textDecoration: "underline", cursor: "pointer" }}
                          onClick={() => handleRegenerate(t)}
                          disabled={regenerateTurn.isPending}
                        >
                          regenerar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="chat-input-row">
              <textarea
                className="search-input"
                placeholder={selectedProfile ? "Digite sua mensagem… (Enter envia, Shift+Enter quebra linha)" : "Selecione um profile no topo primeiro"}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={!selectedProfile || createTurn.isPending || !canUseConversation}
                aria-label="Mensagem para enviar"
              />
              <button
                type="button"
                className="btn primary"
                onClick={() => sendMessage()}
                disabled={!selectedProfile || !draft.trim() || createTurn.isPending || !canUseConversation}
              >
                {createTurn.isPending ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </section>

          {profilePanelOpen && userId && (
            <aside className="profile-panel">
              <div className="profile-panel-header">
                <span>Perfil</span>
                <span className="profile-uid" title={userId}>{userId}</span>
              </div>
              <div className="profile-panel-body">
                <UserProfilePanel
                  profile={graphProfile}
                  isLoading={profileLoading}
                  is503={is503}
                />
              </div>
            </aside>
          )}
        </div>

        {pendingWorkflowIds.map((wfId) => (
          <TurnResolver
            key={wfId}
            workflowId={wfId}
            conversationId={activeConvId}
            onSettled={handleSettled}
          />
        ))}
      </div>

      {activeConvId && (
        <TimelineDrawer
          open={timelineOpen}
          onClose={() => setTimelineOpen(false)}
          scope={{ kind: "conversation", id: activeConvId }}
        />
      )}
    </>
  );
}
