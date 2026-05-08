import { useState } from "react";
import { IconPlus } from "@shared/ui/icons/Icons";
import { useListConversationProfiles, useCreateConversationTurn } from "@shared/hooks/useConversation";

export function ConversationPage() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [selectedProfile, setSelectedProfile] = useState("");
  const [conversationId, setConversationId] = useState("");

  // API real: lista profiles de conversa do backend
  const { data: profiles, isLoading: profilesLoading, error: profilesError } = useListConversationProfiles();
  const createTurn = useCreateConversationTurn();

  // Histórico local de turnos enviados nesta sessão
  const [sentTurns, setSentTurns] = useState<Array<{
    workflow_id: string;
    profile_id: string;
    conversation_id: string;
    message: string;
    status: string;
    created_at: string;
  }>>([]);

  const handleCreateConversation = () => {
    if (!selectedProfile || !newMessage.trim()) return;
    const convId = conversationId || `conv_${Date.now().toString(36)}`;
    createTurn.mutate(
      {
        profile_id: selectedProfile,
        conversation_id: convId,
        message: newMessage,
      },
      {
        onSuccess: (response) => {
          setSentTurns((prev) => [{
            workflow_id: response.workflow_id,
            profile_id: response.profile_id,
            conversation_id: response.conversation_id,
            message: newMessage,
            status: response.status,
            created_at: response.created_at,
          }, ...prev]);
          setShowNewDialog(false);
          setNewMessage("");
          setConversationId("");
        },
        onError: (err) => {
          alert(`Erro ao criar turno: ${err.message}`);
        },
      }
    );
  };

  return (
    <>
      <div className="page-topbar">
        <span className="page-title">Conversation</span>
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">Chat multi-turn com agentes</span>
        <div style={{ flex: 1 }}></div>
        <button className="btn primary" onClick={() => setShowNewDialog(true)}>
          <IconPlus size={14} />
          Nova conversa
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Conversas</h1>
        <p className="page-lead">
          Cada conversa é uma sessão multi-turn vinculada a um perfil de agente conversacional. O contexto é mantido via memória de curto prazo (Redis) e longo prazo (graph store).
        </p>

        <div className="stat-grid">
          <div className="stat">
            <div className="label">Profiles disponíveis</div>
            <div className="value">{profilesLoading ? "…" : (profiles?.length ?? 0)}</div>
            <div className="delta">via API</div>
          </div>
          <div className="stat">
            <div className="label">Turnos enviados</div>
            <div className="value" style={{ color: "oklch(0.45 0.13 60)" }}>{sentTurns.length}</div>
            <div className="delta">nesta sessão</div>
          </div>
        </div>

        {profilesError && (
          <div className="card" style={{ padding: 16, borderColor: "var(--err)", marginBottom: 16 }}>
            <span style={{ color: "var(--err)", fontSize: 13 }}>
              Erro ao carregar profiles: {profilesError.message}
            </span>
          </div>
        )}

        {/* Dialog para nova conversa */}
        {showNewDialog && (
          <div className="card" style={{ marginBottom: 24, border: "1px solid var(--accent)", padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Nova Conversa</div>
            <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
              <select
                className="field-select"
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
              >
                <option value="">Selecione um profile…</option>
                {profiles?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.id} {p.description ? `— ${p.description}` : ""}
                  </option>
                ))}
              </select>
              <input
                className="search-input"
                placeholder="Conversation ID (opcional, gera automático)"
                value={conversationId}
                onChange={(e) => setConversationId(e.target.value)}
              />
              <textarea
                className="search-input"
                placeholder="Digite a mensagem inicial…"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{ minHeight: 80, resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => setShowNewDialog(false)}>Cancelar</button>
                <button
                  className="btn primary"
                  onClick={handleCreateConversation}
                  disabled={createTurn.isPending || !selectedProfile || !newMessage.trim()}
                >
                  {createTurn.isPending ? "Enviando…" : "Criar conversa"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profiles do backend */}
        {profiles && profiles.length > 0 && (
          <>
            <div className="section-head"><h2>Profiles de Conversa</h2></div>
            <div className="card-grid">
              {profiles.map((p) => (
                <div key={p.id} className="card">
                  <div className="card-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="card-title">{p.name || p.id}</div>
                      <div className="card-sub">{p.id}</div>
                    </div>
                    <span className="pill" data-tone="ok"><span className="dot"></span>ativo</span>
                  </div>
                  {p.description && <div className="card-desc">{p.description}</div>}
                  <div className="card-foot">
                    <span>{p.user_id ? `user: ${p.user_id}` : "sem user padrão"}</span>
                    <button
                      className="btn primary"
                      style={{ padding: "4px 10px", fontSize: 11 }}
                      onClick={() => {
                        setSelectedProfile(p.id);
                        setShowNewDialog(true);
                      }}
                    >
                      Iniciar conversa →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {profilesLoading && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink-3)" }}>
            Carregando profiles…
          </div>
        )}

        {!profilesLoading && (!profiles || profiles.length === 0) && !profilesError && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>💬</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum profile encontrado</div>
            <div style={{ color: "var(--ink-3)", fontSize: 13 }}>
              Configure profiles de conversa no backend (pasta <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>docs/profiles/</code>).
            </div>
          </div>
        )}

        {/* Turnos enviados nesta sessão */}
        {sentTurns.length > 0 && (
          <>
            <div className="section-head" style={{ marginTop: 32 }}><h2>Turnos Enviados</h2></div>
            <table className="table">
              <thead>
                <tr>
                  <th>Workflow ID</th>
                  <th>Profile</th>
                  <th>Conversation ID</th>
                  <th>Mensagem</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sentTurns.map((t) => (
                  <tr key={t.workflow_id}>
                    <td className="mono" style={{ fontSize: 12 }}>{t.workflow_id}</td>
                    <td className="mono muted" style={{ fontSize: 12 }}>{t.profile_id}</td>
                    <td className="mono muted" style={{ fontSize: 12 }}>{t.conversation_id}</td>
                    <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.message}</td>
                    <td>
                      <span className="pill" data-tone="run"><span className="dot"></span>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}
