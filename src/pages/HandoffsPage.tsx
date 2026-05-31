import { useState } from "react";
import { useAuth } from "@app/auth-context";
import { canAny } from "@shared/authz";
import { useHandoffsList, useCloseHandoff, useAssignHandoff } from "@shared/hooks/useHandoffs";
import { useConversationTurns } from "@shared/hooks/useConversationsHistory";
import { handoffStatusLabel, handoffReasonLabel, type Handoff } from "@shared/api/handoffs";
import { getActiveTenantSlug } from "@shared/api/token";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function StatusBadge({ handoff }: { handoff: Handoff }) {
  const status = handoffStatusLabel(handoff);
  const colors: Record<string, { bg: string; color: string }> = {
    active: { bg: "#e6f9ee", color: "#1a7a40" },
    pending: { bg: "#fff7e6", color: "#b45309" },
    closed: { bg: "#f3f4f6", color: "#6b7280" },
  };
  const style = colors[status] ?? colors.closed;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "2px 8px",
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      ...style,
    }}>
      {status === "active" && (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1a7a40", display: "inline-block" }} />
      )}
      {status}
    </span>
  );
}

function ConversationHistory({ conversationId }: { conversationId: string }) {
  const tenantSlug = getActiveTenantSlug() ?? undefined;
  const { data, isLoading, error } = useConversationTurns(conversationId, tenantSlug, {
    refetchInterval: false,
  });

  if (isLoading) {
    return <div style={{ padding: 20, opacity: 0.5, fontSize: 13 }}>Carregando histórico...</div>;
  }
  if (error || !data?.turns?.length) {
    return (
      <div style={{ padding: 20, opacity: 0.5, fontSize: 13 }}>
        {error ? "Erro ao carregar histórico." : "Nenhuma mensagem registrada."}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 0" }}>
      {data.turns.map((turn) => (
        <div
          key={turn.id}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: turn.role === "user" ? "flex-end" : "flex-start",
          }}
        >
          <div style={{
            maxWidth: "80%",
            padding: "8px 12px",
            borderRadius: turn.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
            background: turn.role === "user" ? "var(--color-accent, #2563eb)" : "var(--bg-secondary, #f3f4f6)",
            color: turn.role === "user" ? "#fff" : "inherit",
            fontSize: 13,
            lineHeight: 1.5,
          }}>
            {turn.content}
          </div>
          <span style={{ fontSize: 10, opacity: 0.45, marginTop: 3, padding: "0 4px" }}>
            {turn.role === "user" ? "Lead" : "Assistente"} · {fmtDate(turn.created_at)}
          </span>
        </div>
      ))}
    </div>
  );
}

function HandoffDetail({
  handoff,
  onClose,
}: {
  handoff: Handoff;
  onClose: () => void;
}) {
  const [summary, setSummary] = useState("");
  const [assignTo, setAssignTo] = useState(handoff.AssignedTo ?? "");
  const [showAssign, setShowAssign] = useState(false);

  const closeHandoff = useCloseHandoff();
  const assignHandoff = useAssignHandoff();

  const status = handoffStatusLabel(handoff);
  const isClosed = status === "closed";

  const handleClose = async () => {
    if (!summary.trim()) return;
    await closeHandoff.mutateAsync({ id: handoff.ID, summary: summary.trim() });
    onClose();
  };

  const handleAssign = async () => {
    if (!assignTo.trim()) return;
    await assignHandoff.mutateAsync({ id: handoff.ID, assignedTo: assignTo.trim() });
    setShowAssign(false);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "var(--bg-primary, #fff)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 20px",
        borderBottom: "1px solid var(--border, #e5e7eb)",
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            opacity: 0.6,
          }}
          aria-label="Fechar"
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {handoff.ConversationID}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <StatusBadge handoff={handoff} />
            <span style={{ fontSize: 11, opacity: 0.5 }}>{handoffReasonLabel(handoff)}</span>
          </div>
        </div>
        {!isClosed && (
          <button
            type="button"
            onClick={() => setShowAssign((v) => !v)}
            style={{
              padding: "5px 10px",
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid var(--border, #e5e7eb)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Atribuir
          </button>
        )}
      </div>

      {/* Assign section */}
      {showAssign && !isClosed && (
        <div style={{
          padding: "10px 20px",
          borderBottom: "1px solid var(--border, #e5e7eb)",
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "var(--bg-secondary, #f9fafb)",
          flexShrink: 0,
        }}>
          <input
            type="text"
            placeholder="Nome ou e-mail do atendente"
            value={assignTo}
            onChange={(e) => setAssignTo(e.target.value)}
            style={{
              flex: 1,
              padding: "6px 10px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid var(--border, #e5e7eb)",
              background: "var(--bg-primary, #fff)",
            }}
          />
          <button
            type="button"
            onClick={handleAssign}
            disabled={!assignTo.trim() || assignHandoff.isPending}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              borderRadius: 6,
              border: "none",
              background: "var(--color-accent, #2563eb)",
              color: "#fff",
              cursor: "pointer",
              opacity: (!assignTo.trim() || assignHandoff.isPending) ? 0.5 : 1,
            }}
          >
            Salvar
          </button>
        </div>
      )}

      {/* Meta info */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "6px 16px",
        padding: "12px 20px",
        borderBottom: "1px solid var(--border, #e5e7eb)",
        fontSize: 12,
        flexShrink: 0,
      }}>
        <div><span style={{ opacity: 0.5 }}>Iniciado</span><br /><strong>{fmtDate(handoff.ActivatedAt)}</strong></div>
        <div><span style={{ opacity: 0.5 }}>Atendente</span><br /><strong>{handoff.AssignedTo || "—"}</strong></div>
        {isClosed && (
          <>
            <div><span style={{ opacity: 0.5 }}>Encerrado</span><br /><strong>{fmtDate(handoff.ClosedAt)}</strong></div>
            <div style={{ gridColumn: "1/-1" }}>
              <span style={{ opacity: 0.5 }}>Resumo</span><br />
              <span>{handoff.ClosingSummary || "—"}</span>
            </div>
          </>
        )}
      </div>

      {/* Conversation history */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
        <ConversationHistory conversationId={handoff.ConversationID} />
      </div>

      {/* Close form */}
      {!isClosed && (
        <div style={{
          padding: 16,
          borderTop: "1px solid var(--border, #e5e7eb)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flexShrink: 0,
        }}>
          <label style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
            Resumo do atendimento
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Descreva o resultado do atendimento humano..."
            rows={3}
            style={{
              resize: "vertical",
              padding: "8px 10px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid var(--border, #e5e7eb)",
              background: "var(--bg-primary, #fff)",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />
          <button
            type="button"
            onClick={handleClose}
            disabled={!summary.trim() || closeHandoff.isPending}
            style={{
              padding: "9px 0",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              border: "none",
              background: "var(--color-accent, #2563eb)",
              color: "#fff",
              cursor: "pointer",
              opacity: (!summary.trim() || closeHandoff.isPending) ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {closeHandoff.isPending ? "Encerrando..." : "Encerrar atendimento"}
          </button>
          {closeHandoff.isError && (
            <div style={{ fontSize: 12, color: "#dc2626" }}>
              Erro ao encerrar. Tente novamente.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function HandoffsPage() {
  const { isSuper, hasPermission } = useAuth();
  const [selected, setSelected] = useState<Handoff | null>(null);
  const [filter, setFilter] = useState<"active" | "all">("active");

  const canView = canAny({ isSuper, hasPermission }, ["workflow_list", "conversation_turn"]);
  const { data, isLoading, error, refetch } = useHandoffsList({
    refetchInterval: 10_000,
  });

  const handoffs = (data?.handoffs ?? []).filter((h) => {
    const status = handoffStatusLabel(h);
    return filter === "all" || status === "active";
  });

  if (!canView) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5, fontSize: 14 }}>
        Sem permissão para visualizar handoffs.
      </div>
    );
  }

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }} />
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar — handoff list */}
        <div style={{
          width: selected ? 320 : "100%",
          maxWidth: selected ? 320 : undefined,
          flexShrink: 0,
          borderRight: selected ? "1px solid var(--border, #e5e7eb)" : "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "width 0.2s",
        }}>
          {/* Toolbar */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border, #e5e7eb)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}>
            <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>
              Atendimentos
              {data && (
                <span style={{
                  marginLeft: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "1px 7px",
                  borderRadius: 99,
                  background: "var(--bg-secondary, #f3f4f6)",
                }}>
                  {handoffs.length}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setFilter(filter === "active" ? "all" : "active")}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid var(--border, #e5e7eb)",
                background: filter === "all" ? "var(--color-accent, #2563eb)" : "transparent",
                color: filter === "all" ? "#fff" : "inherit",
                cursor: "pointer",
              }}
            >
              {filter === "active" ? "Mostrar todos" : "Só ativos"}
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              aria-label="Atualizar"
              style={{
                padding: "4px 8px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid var(--border, #e5e7eb)",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {isLoading && (
              <div style={{ padding: 20, opacity: 0.5, fontSize: 13, textAlign: "center" }}>
                Carregando...
              </div>
            )}
            {error && (
              <div style={{ padding: 20, fontSize: 13, color: "#dc2626", textAlign: "center" }}>
                Erro ao carregar handoffs.
              </div>
            )}
            {!isLoading && !error && handoffs.length === 0 && (
              <div style={{ padding: 32, opacity: 0.4, fontSize: 13, textAlign: "center" }}>
                {filter === "active" ? "Nenhum handoff ativo no momento." : "Nenhum handoff encontrado."}
              </div>
            )}
            {handoffs.map((h) => {
              const isActive = handoffStatusLabel(h) === "active";
              const isSelected = selected?.ID === h.ID;
              return (
                <button
                  key={h.ID}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : h)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border, #e5e7eb)",
                    background: isSelected ? "var(--bg-secondary, #f3f4f6)" : "transparent",
                    border: "none",
                    borderBottomColor: "var(--border, #e5e7eb)",
                    borderBottomWidth: 1,
                    borderBottomStyle: "solid",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    transition: "background 0.1s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}>
                      {h.ConversationID}
                    </span>
                    <StatusBadge handoff={h} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.55 }}>
                    <span>{handoffReasonLabel(h)}</span>
                    {h.AssignedTo && (
                      <>
                        <span>·</span>
                        <span>{h.AssignedTo}</span>
                      </>
                    )}
                    <span style={{ marginLeft: "auto" }}>{fmtDate(isActive ? h.ActivatedAt : h.ClosedAt)}</span>
                  </div>
                  {h.ClosingSummary && (
                    <div style={{ fontSize: 11, opacity: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.ClosingSummary}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <HandoffDetail
              key={selected.ID}
              handoff={selected}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </>
  );
}
