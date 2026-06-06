import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@app/auth-context";
import { canAny } from "@shared/authz";
import { useHandoffsList, useCloseHandoff, useAssignHandoff } from "@shared/hooks/useHandoffs";
import { useConversationTurns } from "@shared/hooks/useConversationsHistory";
import { handoffStatusLabel, handoffReasonLabel, type Handoff, type HandoffStatus } from "@shared/api/handoffs";
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

function fmtRelativeDate(iso: string | null | undefined): string {
  if (!iso) return "agora";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "agora";
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h atrás`;
  const d = Math.floor(h / 24);
  return `${d} d atrás`;
}

function calcElapsedSecs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return 0;
  return Math.max(0, Math.floor((Date.now() - ts) / 1000));
}

function fmtElapsed(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type StatusMeta = { label: string; bg: string; color: string; dot: string };
const STATUS_META: Record<HandoffStatus, StatusMeta> = {
  active: { label: "Em atendimento", bg: "#e6f9ee", color: "#1a7a40", dot: "#1a7a40" },
  pending: { label: "Pendente", bg: "#fff7e6", color: "#b45309", dot: "#b45309" },
  closed: { label: "Encerrado", bg: "#f3f4f6", color: "#6b7280", dot: "#6b7280" },
};

function statusMeta(handoff: Handoff): StatusMeta {
  const s = handoffStatusLabel(handoff);
  return STATUS_META[s] ?? STATUS_META.pending;
}

function reasonPt(handoff: Handoff): string {
  const label = handoffReasonLabel(handoff);
  if (label === "Guardrail") return "Bloqueio de segurança";
  return "Lead qualificado";
}

function StatusBadge({ handoff }: { handoff: Handoff }) {
  const meta = statusMeta(handoff);
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 9px",
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.01em",
      background: meta.bg,
      color: meta.color,
      border: "1px solid color-mix(in srgb, currentColor 16%, transparent)",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.dot, display: "inline-block" }} />
      {meta.label}
    </span>
  );
}

function SlaTimer({ since }: { since: string | null | undefined }) {
  const [elapsed, setElapsed] = useState(() => calcElapsedSecs(since));

  useEffect(() => {
    const id = setInterval(() => setElapsed(calcElapsedSecs(since)), 1000);
    return () => clearInterval(id);
  }, [since]);

  const color = elapsed < 300 ? "#16a34a" : elapsed < 900 ? "#d97706" : "#dc2626";
  const urgent = elapsed >= 900;

  return (
    <span style={{
      fontVariantNumeric: "tabular-nums",
      fontSize: 11,
      fontWeight: 700,
      color,
      letterSpacing: "0.02em",
      animation: urgent ? "pulse 2s ease-in-out infinite" : undefined,
    }}>
      {fmtElapsed(elapsed)}
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
            <span style={{ fontSize: 11, opacity: 0.6 }}>{reasonPt(handoff)}</span>
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
        {!isClosed && (
          <div>
            <span style={{ opacity: 0.5 }}>Tempo esperando</span><br />
            <strong><SlaTimer since={handoff.ActivatedAt ?? handoff.CreatedAt} /></strong>
          </div>
        )}
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
  const [filter, setFilter] = useState<"active" | "pending" | "closed" | "all">("active");
  const [query, setQuery] = useState("");

  const canView = canAny({ isSuper, hasPermission }, ["workflow_list", "conversation_turn"]);
  const { data, isLoading, error, refetch } = useHandoffsList({
    refetchInterval: 5_000,
  });

  const allHandoffs = data?.handoffs ?? [];
  const metrics = useMemo(() => {
    const active = allHandoffs.filter((h) => handoffStatusLabel(h) === "active").length;
    const pending = allHandoffs.filter((h) => handoffStatusLabel(h) === "pending").length;
    const closed = allHandoffs.filter((h) => handoffStatusLabel(h) === "closed").length;
    return { active, pending, closed, total: allHandoffs.length };
  }, [allHandoffs]);
  const handoffs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allHandoffs.filter((h) => {
      const status = handoffStatusLabel(h);
      if (filter !== "all" && status !== filter) return false;
      if (!q) return true;
      const haystack = `${h.ConversationID} ${h.AssignedTo || ""} ${reasonPt(h)}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [allHandoffs, filter, query]);

  useEffect(() => {
    if (!selected) return;
    if (!allHandoffs.some((h) => h.ID === selected.ID)) setSelected(null);
  }, [allHandoffs, selected]);

  useEffect(() => {
    const count = metrics.pending + metrics.active;
    document.title = count > 0 ? `(${count}) Atendimentos — Archon` : "Atendimentos — Archon";
    return () => { document.title = "Archon"; };
  }, [metrics.pending, metrics.active]);

  if (!canView) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5, fontSize: 14 }}>
        Sem permissão para visualizar atendimentos.
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes ring-pulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
      `}</style>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 48px)" }}>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
        }}>
          <span className="pill" data-tone={filter === "active" ? "ok" : undefined}><span className="dot" />Em atendimento: {metrics.active}</span>
          <span className="pill" data-tone={filter === "pending" ? "warn" : undefined}><span className="dot" />Pendentes: {metrics.pending}</span>
          <span className="pill" data-tone={filter === "closed" ? "run" : undefined}><span className="dot" />Encerrados: {metrics.closed}</span>
          <span className="pill">Total: {metrics.total}</span>
          <div style={{ flex: 1 }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por conversa, atendente ou motivo..."
            style={{
              width: "min(420px, 100%)",
              minWidth: 220,
              padding: "7px 10px",
              borderRadius: "var(--r-2)",
              border: "1px solid var(--line)",
              background: "var(--bg)",
              color: "var(--ink)",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
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
              onClick={() => setFilter((f) => (f === "all" ? "active" : "all"))}
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
              {filter === "all" ? "Só em atendimento" : "Mostrar todos"}
            </button>
            <select
              aria-label="Filtrar status"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid var(--border, #e5e7eb)",
                background: "var(--surface)",
                color: "var(--ink)",
              }}
            >
              <option value="active">Em atendimento</option>
              <option value="pending">Pendentes</option>
              <option value="closed">Encerrados</option>
              <option value="all">Todos</option>
            </select>
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
                Erro ao carregar atendimentos.
              </div>
            )}
            {!isLoading && !error && handoffs.length === 0 && (
              <div style={{ padding: 32, opacity: 0.4, fontSize: 13, textAlign: "center" }}>
                {filter === "active" ? "Nenhum atendimento ativo no momento." : "Nenhum atendimento encontrado."}
              </div>
            )}
            {handoffs.map((h) => {
              const status = handoffStatusLabel(h);
              const isActive = status === "active";
              const isSelected = selected?.ID === h.ID;
              const isUrgent = (() => {
                if (status === "closed") return false;
                const ref = h.ActivatedAt ?? h.CreatedAt;
                if (!ref) return false;
                return Date.now() - new Date(ref).getTime() > 15 * 60 * 1000;
              })();
              return (
                <button
                  key={h.ID}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : h)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "13px 16px",
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
                    animation: isUrgent ? "ring-pulse 2s ease-in-out infinite" : undefined,
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
                    <span>{reasonPt(h)}</span>
                    {h.AssignedTo && (
                      <>
                        <span>·</span>
                        <span>{h.AssignedTo}</span>
                      </>
                    )}
                    <span style={{ marginLeft: "auto" }}>{fmtRelativeDate(isActive ? h.ActivatedAt : h.ClosedAt)}</span>
                    {status !== "closed" && (
                      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                        <SlaTimer since={isActive ? h.ActivatedAt : h.CreatedAt} />
                      </span>
                    )}
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
      </div>
    </>
  );
}
