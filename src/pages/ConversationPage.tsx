import { useCallback, useEffect, useMemo, useState } from "react";
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

/**
 * Invisible poller for a pending workflow. Drives status → result → invalidate
 * conversation turns cache so the assistant message lands automatically.
 */
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
    // Backend already backfills conversation_turns.output via GET /result.
    // Invalidate so the UI refetches the turn list with resolved content.
    qc.invalidateQueries({ queryKey: conversationsKeys.turns(conversationId) });
    onSettled();
  }, [result, done, qc, conversationId, onSettled]);

  return null;
}

export function ConversationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const presetProfile = searchParams.get("profile") || "";
  const initialConvId = searchParams.get("conv") || "";

  const [activeConvId, setActiveConvId] = useState<string>(initialConvId);
  const [draft, setDraft] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(presetProfile);

  const { data: profiles, isLoading: profilesLoading, error: profilesError } = useListConversationProfiles();
  const createTurn = useCreateConversationTurn();
  const { data: convsPage, isLoading: convsLoading } = useConversationsList(undefined, { limit: 50 });
  const conversations = convsPage?.items || [];
  const deleteConv = useDeleteConversation();
  const editTurn = useEditConversationTurn();
  const regenerateTurn = useRegenerateConversationTurn();
  const qc = useQueryClient();

  const turnsQuery = useConversationTurns(activeConvId, undefined, { enabled: !!activeConvId });
  const turns = turnsQuery.data?.turns || [];
  const activeMeta = turnsQuery.data?.conversation;

  const pendingWorkflowIds = useMemo(
    () => turns.filter((t) => t.status === "pending" && t.workflow_id).map((t) => t.workflow_id!),
    [turns]
  );

  // Sync URL with active conversation
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (activeConvId) {
      if (next.get("conv") !== activeConvId) {
        next.set("conv", activeConvId);
        setSearchParams(next, { replace: true });
      }
    }
  }, [activeConvId, searchParams, setSearchParams]);

  // Track profile from active conv
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
    // No persistence yet — backend creates the conversation row on first turn POST.
    qc.setQueryData(conversationsKeys.turns(id), { conversation: null, turns: [] });
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !selectedProfile) return;
    let convId = activeConvId;
    if (!convId) {
      convId = `conv_${Date.now().toString(36)}`;
      setActiveConvId(convId);
    }

    // History from already-resolved assistant exchanges
    const history = turns
      .filter((t) => t.status === "ok")
      .map((t) => ({ role: t.role, content: t.content }));

    setDraft("");
    createTurn.mutate(
      {
        profile_id: selectedProfile,
        conversation_id: convId,
        message: text,
        history: history.length > 0 ? history : undefined,
      },
      {
        onSuccess: (response: any) => {
          // Backend echoes inserted rows so we can splice them straight into
          // the cache instead of round-tripping the list endpoint.
          if (response?.turns?.length && convId) {
            qc.setQueryData(conversationsKeys.turns(convId), (prev: any) => {
              const existing = prev?.turns || [];
              const seen = new Set(existing.map((t: any) => t.id));
              const merged = [...existing];
              for (const t of response.turns as ConversationTurnRow[]) {
                if (!seen.has(t.id)) merged.push(t);
              }
              return {
                conversation: prev?.conversation || {
                  conversation_id: convId,
                  profile_id: response.profile_id,
                  message_count: merged.length,
                },
                turns: merged,
              };
            });
          }
          qc.invalidateQueries({ queryKey: conversationsKeys.list() });
        },
        onError: (err: any) => {
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

  const handleRegenerate = (turn: ConversationTurnRow) => {
    if (!window.confirm("Regenerar resposta? O turno atual será reprocessado.")) return;
    regenerateTurn.mutate({
      conversationId: activeConvId,
      turnId: turn.id,
      profileId: activeMeta?.profile_id || selectedProfile,
    });
  };

  const handleDelete = (convId: string) => {
    if (!window.confirm("Excluir esta conversa?")) return;
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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .conv-layout { display: grid; grid-template-columns: 280px 1fr; gap: 16px; min-height: calc(100vh - 200px); }
        .conv-sidebar { border: 1px solid var(--line); border-radius: var(--r-2); background: var(--surface); overflow: hidden; display: flex; flex-direction: column; }
        .conv-list { flex: 1; overflow-y: auto; }
        .conv-item { padding: 10px 12px; border-bottom: 1px solid var(--line); cursor: pointer; }
        .conv-item:hover { background: var(--surface-2); }
        .conv-item[data-active="true"] { background: var(--surface-2); border-left: 3px solid var(--accent); padding-left: 9px; }
        .chat-area { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: var(--r-2); background: var(--surface); }
        .chat-msgs { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px; min-height: 400px; }
        .chat-msg { max-width: 75%; padding: 10px 14px; border-radius: 12px; font-size: 13.5px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
        .chat-msg[data-role="user"] { background: var(--accent); color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
        .chat-msg[data-role="assistant"] { background: var(--surface-2); color: var(--ink); align-self: flex-start; border-bottom-left-radius: 4px; border: 1px solid var(--line); }
        .chat-msg[data-status="pending"] { opacity: 0.7; font-style: italic; }
        .chat-msg[data-status="failed"] { background: oklch(0.55 0.18 25 / 0.15); color: var(--err); }
        .chat-input-row { padding: 12px; border-top: 1px solid var(--line); display: flex; gap: 8px; align-items: flex-end; }
        .chat-input-row textarea { flex: 1; resize: none; min-height: 44px; max-height: 160px; }
        .chat-header { padding: 12px 16px; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 12px; }
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
        <button className="btn primary" onClick={startConversation}>
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
              Histórico ({conversations.length})
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
                    className="btn ghost"
                    onClick={() => setTimelineOpen(true)}
                    title="Abrir trail de auditoria desta conversa"
                    style={{ fontSize: 12 }}
                  >
                    Auditoria
                  </button>
                </>
              ) : (
                <div style={{ color: "var(--ink-3)", fontSize: 13 }}>
                  Selecione uma conversa ou crie uma nova
                </div>
              )}
            </div>

            <div className="chat-msgs">
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
                    {display}
                    <div style={{ marginTop: 6, fontSize: 10, opacity: 0.7, display: "flex", gap: 10 }}>
                      {t.role === "assistant" && t.workflow_id && t.status !== "pending" && (
                        <Link
                          to={`/workflows/result?id=${encodeURIComponent(t.workflow_id)}`}
                          style={{ color: "inherit", textDecoration: "underline" }}
                        >
                          Ver trace →
                        </Link>
                      )}
                      {t.role === "user" && t.status === "ok" && (
                        <button
                          className="btn ghost"
                          style={{ padding: "0", fontSize: 10, color: "inherit", background: "transparent", border: "none", textDecoration: "underline", cursor: "pointer" }}
                          onClick={() => handleEditMessage(t)}
                        >
                          editar
                        </button>
                      )}
                      {t.role === "assistant" && t.status !== "pending" && (
                        <button
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
                disabled={!selectedProfile || createTurn.isPending}
              />
              <button
                className="btn primary"
                onClick={sendMessage}
                disabled={!selectedProfile || !draft.trim() || createTurn.isPending}
              >
                {createTurn.isPending ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </section>
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
