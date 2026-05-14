import { useState } from "react";
import { useAuth } from "@app/auth-context";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { IconPlus } from "@shared/ui/icons/Icons";
import { useConfirm, useToast } from "@shared/ui/feedback";
import {
  useDeleteChannelCredential,
  useActivateChannelCredential,
  useDeactivateChannelCredential,
  useUpsertChannelCredential,
  useDisconnectChannelLink,
  useUpsertChannelLink,
  useChannelLinks,
} from "@shared/hooks/useChannels";
import type { AuthMode, ChannelCredential, ChannelKind, CredentialStatus } from "@shared/api/channels";

// ─── Credentials panel ────────────────────────────────────────────────────────

interface CredentialRowProps {
  cred: ChannelCredential;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}

function CredentialRow({ cred, onActivate, onDeactivate, onDelete, busy }: CredentialRowProps) {
  const statusTone: Record<CredentialStatus, string> = {
    active: "ok",
    inactive: "warn",
    revoked: "err",
  };
  return (
    <tr>
      <td className="mono" style={{ fontSize: 12 }}>{cred.channel}</td>
      <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
        {cred.integration || "—"}
      </td>
      <td style={{ fontSize: 12, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {cred.webhook_url}
      </td>
      <td>
        <span className="pill" data-tone={statusTone[cred.status] || "neutral"}>
          <span className="dot" />
          {cred.status}
        </span>
      </td>
      <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{cred.auth_mode || "bearer"}</td>
      <td style={{ fontSize: 11, color: "var(--muted)" }}>
        {new Date(cred.updated_at).toLocaleString()}
      </td>
      <td>
        <div style={{ display: "flex", gap: 6 }}>
          {cred.status !== "active" && (
            <button
              className="btn"
              style={{ fontSize: 12, padding: "3px 10px" }}
              disabled={busy}
              onClick={() => onActivate(cred.id)}
            >
              Ativar
            </button>
          )}
          {cred.status === "active" && (
            <button
              className="btn"
              style={{ fontSize: 12, padding: "3px 10px" }}
              disabled={busy}
              onClick={() => onDeactivate(cred.id)}
            >
              Pausar
            </button>
          )}
          <button
            className="btn"
            style={{ fontSize: 12, padding: "3px 10px", color: "var(--err)" }}
            disabled={busy || cred.status === "revoked"}
            onClick={() => onDelete(cred.id)}
          >
            Revogar
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Links panel ─────────────────────────────────────────────────────────────

function LinksPanel({ tenantSlug }: { tenantSlug?: string }) {
  const [convId, setConvId] = useState("");
  const [inputConvId, setInputConvId] = useState("");

  const linksQuery = useChannelLinks(convId, tenantSlug);
  const disconnect = useDisconnectChannelLink(tenantSlug);
  const upsert = useUpsertChannelLink(tenantSlug);
  const toast = useToast();
  const confirm = useConfirm();

  const [showAdd, setShowAdd] = useState(false);
  const [addChannel, setAddChannel] = useState<ChannelKind>("whatsapp");
  const [addRecipient, setAddRecipient] = useState("");
  const [addSession, setAddSession] = useState("");

  const handleSearch = () => setConvId(inputConvId.trim());

  const handleAdd = async () => {
    if (!convId) return;
    try {
      await upsert.mutateAsync({
        conversation_id: convId,
        channel: addChannel,
        recipient: addChannel === "whatsapp" ? addRecipient : undefined,
        session_id: addChannel === "web" ? Number(addSession) || undefined : undefined,
      });
      toast.success("Vínculo salvo.");
      setShowAdd(false);
      setAddRecipient("");
      setAddSession("");
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || err}`);
    }
  };

  const handleDisconnect = async (channel: string) => {
    const ok = await confirm({
      title: "Desconectar canal",
      message: `Desconectar o canal "${channel}" desta conversa?`,
      confirmLabel: "Desconectar",
      destructive: true,
    });
    if (!ok) return;
    try {
      await disconnect.mutateAsync({ conversationId: convId, channel });
      toast.success("Canal desconectado.");
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || err}`);
    }
  };

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Vínculos de conversa</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
        Busque por ID de conversa para ver ou gerenciar os canais vinculados.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          className="search-input"
          placeholder="ID da conversa"
          value={inputConvId}
          onChange={(e) => setInputConvId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          style={{ maxWidth: 340 }}
        />
        <button className="btn primary" onClick={handleSearch}>Buscar</button>
        {convId && (
          <button className="btn" onClick={() => setShowAdd(true)}>
            <IconPlus size={13} /> Adicionar canal
          </button>
        )}
      </div>

      {convId && linksQuery.isLoading && <div className="muted">Carregando…</div>}
      {convId && linksQuery.error && (
        <div style={{ color: "var(--err)", fontSize: 13 }}>
          {(linksQuery.error as Error).message}
        </div>
      )}
      {convId && linksQuery.data && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={thStyle}>Canal</th>
              <th style={thStyle}>Destinatário</th>
              <th style={thStyle}>Session ID</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Atualizado</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {linksQuery.data.map((link) => (
              <tr key={link.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="mono" style={{ padding: "8px 6px", fontSize: 12 }}>{link.channel}</td>
                <td style={{ padding: "8px 6px", fontSize: 12 }}>{link.recipient || "—"}</td>
                <td style={{ padding: "8px 6px", fontSize: 12 }}>{link.session_id || "—"}</td>
                <td style={{ padding: "8px 6px" }}>
                  <span
                    className="pill"
                    data-tone={link.status === "active" ? "ok" : link.status === "paused" ? "warn" : "err"}
                  >
                    <span className="dot" />{link.status}
                  </span>
                </td>
                <td style={{ padding: "8px 6px", fontSize: 11, color: "var(--muted)" }}>
                  {new Date(link.updated_at).toLocaleString()}
                </td>
                <td style={{ padding: "8px 6px" }}>
                  {link.status !== "disconnected" && (
                    <button
                      className="btn"
                      style={{ fontSize: 11, padding: "2px 8px", color: "var(--err)" }}
                      onClick={() => void handleDisconnect(link.channel)}
                      disabled={disconnect.isPending}
                    >
                      Desconectar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {linksQuery.data.length === 0 && (
              <tr>
                <td colSpan={6} className="muted" style={{ padding: 12, textAlign: "center" }}>
                  Nenhum vínculo encontrado para esta conversa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {showAdd && convId && (
        <div style={overlayStyle} onClick={() => setShowAdd(false)}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Adicionar vínculo de canal</div>
            <div style={{ display: "grid", gap: 10 }}>
              <select
                className="search-input"
                value={addChannel}
                onChange={(e) => setAddChannel(e.target.value as ChannelKind)}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="web">Web</option>
                <option value="api">API</option>
              </select>
              {addChannel === "whatsapp" && (
                <input
                  className="search-input"
                  placeholder="Destinatário E.164 (ex: +5511999990000)"
                  value={addRecipient}
                  onChange={(e) => setAddRecipient(e.target.value)}
                />
              )}
              {addChannel === "web" && (
                <input
                  className="search-input"
                  placeholder="Session ID (número)"
                  value={addSession}
                  onChange={(e) => setAddSession(e.target.value)}
                />
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => setShowAdd(false)}>Cancelar</button>
              <button className="btn primary" onClick={handleAdd} disabled={upsert.isPending}>
                {upsert.isPending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ChannelsPage() {
  const { activeTenantSlug } = useAuth();
  const tenantSlug = activeTenantSlug || undefined;

  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<"credentials" | "links">("credentials");

  // Credential form state
  const [showCredForm, setShowCredForm] = useState(false);
  const [credChannel, setCredChannel] = useState<ChannelKind>("whatsapp");
  const [credIntegration, setCredIntegration] = useState("");
  const [credWebhook, setCredWebhook] = useState("");
  const [credToken, setCredToken] = useState("");
  const [credAuthMode, setCredAuthMode] = useState<AuthMode>("bearer");

  // Inline credential list — we store results locally after upsert since
  // there is no list-all endpoint (credentials are write-only after creation).
  const [localCreds, setLocalCreds] = useState<ChannelCredential[]>([]);

  const upsertCred = useUpsertChannelCredential(tenantSlug);
  const activateCred = useActivateChannelCredential(tenantSlug);
  const deactivateCred = useDeactivateChannelCredential(tenantSlug);
  const deleteCred = useDeleteChannelCredential(tenantSlug);

  const handleSaveCred = async () => {
    if (!credChannel || !credWebhook) return;
    try {
      const saved = await upsertCred.mutateAsync({
        channel: credChannel,
        integration: credIntegration.trim() || undefined,
        webhook_url: credWebhook.trim(),
        token: credToken.trim() || undefined,
        auth_mode: credAuthMode,
      });
      setLocalCreds((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      toast.success("Credencial salva.");
      setShowCredForm(false);
      setCredWebhook("");
      setCredToken("");
      setCredIntegration("");
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || err}`);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const updated = await activateCred.mutateAsync(id);
      setLocalCreds((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || err}`);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      const updated = await deactivateCred.mutateAsync(id);
      setLocalCreds((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || err}`);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Revogar credencial",
      message: "Esta ação é irreversível. O token será descartado permanentemente.",
      confirmLabel: "Revogar",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteCred.mutateAsync(id);
      setLocalCreds((prev) => prev.filter((c) => c.id !== id));
      toast.success("Credencial revogada.");
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || err}`);
    }
  };

  const busy = activateCred.isPending || deactivateCred.isPending || deleteCred.isPending;

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }} />
        {tab === "credentials" && (
          <button className="btn primary" onClick={() => setShowCredForm(true)}>
            <IconPlus size={14} /> Nova credencial
          </button>
        )}
      </div>

      <div className="page-body">
        <h1 className="page-h1">Canais</h1>
        <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
          Gerencie credenciais de entrega por canal e os vínculos entre conversas e canais de saída.
        </p>

        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
          {(["credentials", "links"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: "none",
                border: "none",
                borderBottom: tab === t ? "2px solid var(--ink)" : "2px solid transparent",
                padding: "8px 18px",
                cursor: "pointer",
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? "var(--ink)" : "var(--muted)",
                font: "inherit",
                marginBottom: -1,
              }}
            >
              {t === "credentials" ? "Credenciais" : "Vínculos"}
            </button>
          ))}
        </div>

        {tab === "credentials" && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
              Credenciais de entrega ({localCreds.length})
            </div>
            {localCreds.length === 0 ? (
              <div className="muted" style={{ padding: 20, textAlign: "center" }}>
                Nenhuma credencial cadastrada nesta sessão. Crie uma nova para começar.
                <br />
                <span style={{ fontSize: 11 }}>
                  Credenciais anteriores são omitidas por segurança — recadastre para rotacionar.
                </span>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={thStyle}>Canal</th>
                      <th style={thStyle}>Integração</th>
                      <th style={thStyle}>Webhook URL</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Auth Mode</th>
                      <th style={thStyle}>Atualizado</th>
                      <th style={thStyle}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {localCreds.map((cred) => (
                      <CredentialRow
                        key={cred.id}
                        cred={cred}
                        onActivate={handleActivate}
                        onDeactivate={handleDeactivate}
                        onDelete={handleDelete}
                        busy={busy}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "links" && (
          <div className="card" style={{ padding: 18 }}>
            <LinksPanel tenantSlug={tenantSlug} />
          </div>
        )}
      </div>

      {showCredForm && (
        <div style={overlayStyle} onClick={() => setShowCredForm(false)}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Nova credencial de canal</div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
              O token é gravado cifrado (AES-256-GCM) e nunca retornado nas respostas.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              <select
                className="search-input"
                value={credChannel}
                onChange={(e) => setCredChannel(e.target.value as ChannelKind)}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="web">Web</option>
                <option value="api">API</option>
              </select>
              <input
                className="search-input"
                placeholder="Integração (opcional, ex: waba-phone-id)"
                value={credIntegration}
                onChange={(e) => setCredIntegration(e.target.value)}
              />
              <input
                className="search-input"
                placeholder="Webhook URL (obrigatório)"
                value={credWebhook}
                onChange={(e) => setCredWebhook(e.target.value)}
              />
              <input
                className="search-input"
                type="password"
                placeholder="Token (write-only)"
                value={credToken}
                onChange={(e) => setCredToken(e.target.value)}
                autoComplete="new-password"
              />
              <select
                className="search-input"
                value={credAuthMode}
                onChange={(e) => setCredAuthMode(e.target.value as AuthMode)}
              >
                <option value="bearer">Bearer</option>
                <option value="x-header">X-Header</option>
                <option value="dual">Dual (bearer + x-header)</option>
                <option value="none">Nenhum</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => setShowCredForm(false)}>Cancelar</button>
              <button
                className="btn primary"
                onClick={handleSaveCred}
                disabled={upsertCred.isPending || !credWebhook}
              >
                {upsertCred.isPending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 6px",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgb(10 12 16 / 0.55)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  padding: 18,
};
