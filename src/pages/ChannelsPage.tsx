import { useState, useEffect } from "react";
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
  useListWhatsAppChannels,
  useCreateWhatsAppChannel,
  useDeleteWhatsAppChannel,
  useWhatsAppQR,
  useWhatsAppStatus,
} from "@shared/hooks/useChannels";
import { useListConversationProfiles } from "@shared/hooks/useConversation";
import { useTenants } from "@shared/hooks/useTenants";
import type { AuthMode, ChannelCredential, ChannelKind, CredentialStatus, WhatsAppChannel } from "@shared/api/channels";

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
              type="button"
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
              type="button"
              className="btn"
              style={{ fontSize: 12, padding: "3px 10px" }}
              disabled={busy}
              onClick={() => onDeactivate(cred.id)}
            >
              Pausar
            </button>
          )}
          <button
            type="button"
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
          aria-label="ID da conversa"
        />
        <button type="button" className="btn primary" onClick={handleSearch}>Buscar</button>
        {convId && (
          <button type="button" className="btn" onClick={() => setShowAdd(true)}>
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
                      type="button"
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
                aria-label="Canal"
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
                  aria-label="Destinatário WhatsApp (E.164)"
                />
              )}
              {addChannel === "web" && (
                <input
                  className="search-input"
                  placeholder="Session ID (número)"
                  value={addSession}
                  onChange={(e) => setAddSession(e.target.value)}
                  aria-label="Session ID"
                />
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" className="btn" onClick={() => setShowAdd(false)}>Cancelar</button>
              <button type="button" className="btn primary" onClick={handleAdd} disabled={upsert.isPending}>
                {upsert.isPending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WhatsApp QR modal ───────────────────────────────────────────────────────

interface QRModalProps {
  channel: WhatsAppChannel;
  tenantSlug?: string;
  onClose: () => void;
  onConnected: () => void;
}

function QRModal({ channel, tenantSlug, onClose, onConnected }: QRModalProps) {
  const qrQuery = useWhatsAppQR(channel.id, tenantSlug, true);
  const statusQuery = useWhatsAppStatus(channel.id, tenantSlug, true);

  useEffect(() => {
    if (statusQuery.data?.state === "open") {
      onConnected();
    }
  }, [statusQuery.data?.state, onConnected]);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div className="card" style={{ ...modalStyle, maxWidth: 360, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 600 }}>Escaneie o QR code</div>
          <button
            type="button"
            className="btn"
            style={{ fontSize: 12, padding: "2px 8px" }}
            onClick={onClose}
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
          Abra WhatsApp &gt; Dispositivos vinculados &gt; Vincular dispositivo
        </p>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          {qrQuery.isLoading && (
            <div className="muted" style={{ padding: 20 }}>Carregando QR...</div>
          )}
          {qrQuery.error && (
            <div style={{ color: "var(--err)", fontSize: 13 }}>
              Erro ao carregar QR. Tente novamente.
            </div>
          )}
          {qrQuery.data && (
            <img
              src={qrQuery.data.base64}
              alt="QR Code"
              style={{ width: 240, height: 240, border: "1px solid var(--border)", borderRadius: 8 }}
            />
          )}
        </div>
        <div style={{ fontSize: 12 }}>
          {statusQuery.data && (
            <span className="pill" data-tone={statusQuery.data.state === "open" ? "ok" : statusQuery.data.state === "connecting" ? "warn" : "neutral"}>
              <span className="dot" />
              {statusQuery.data.state === "open" ? "conectado" : statusQuery.data.state === "connecting" ? "conectando" : "aguardando"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── WhatsApp row ─────────────────────────────────────────────────────────────

interface WhatsAppRowProps {
  ch: WhatsAppChannel;
  tenantSlug?: string;
  onQR: (ch: WhatsAppChannel) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}

function WhatsAppRow({ ch, tenantSlug: _tenantSlug, onQR, onDelete, busy }: WhatsAppRowProps) {
  const connState = ch.state ?? ch.status;
  const statusTone = connState === "open" ? "ok" : connState === "connecting" ? "warn" : "neutral";
  const statusLabel = connState === "open" ? "conectado" : connState === "connecting" ? "conectando" : "desconectado";

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ padding: "8px 6px" }}>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{ch.display_name || ch.instance_name}</div>
        <div className="mono muted" style={{ fontSize: 11 }}>{ch.instance_name}</div>
      </td>
      <td style={{ padding: "8px 6px", fontSize: 13 }}>
        {ch.phone_number || <span className="muted">—</span>}
      </td>
      <td style={{ padding: "8px 6px" }}>
        <span className="pill" data-tone={statusTone}>
          <span className="dot" />
          {statusLabel}
        </span>
      </td>
      <td style={{ padding: "8px 6px", fontSize: 11, color: "var(--muted)" }}>
        {new Date(ch.updated_at).toLocaleString()}
      </td>
      <td style={{ padding: "8px 6px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {connState !== "open" && (
            <button
              type="button"
              className="btn"
              style={{ fontSize: 12, padding: "3px 10px" }}
              onClick={() => onQR(ch)}
              disabled={busy}
              title="Escanear QR para conectar"
            >
              QR
            </button>
          )}
          <button
            type="button"
            className="btn"
            style={{ fontSize: 12, padding: "3px 10px", color: "var(--err)" }}
            onClick={() => onDelete(ch.id)}
            disabled={busy}
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── WhatsApp panel ───────────────────────────────────────────────────────────

function WhatsAppPanel({ tenantSlug, isSuper }: { tenantSlug?: string; isSuper?: boolean }) {
  const toast = useToast();
  const confirm = useConfirm();

  const [displayName, setDisplayName] = useState("");
  const [profileId, setProfileId] = useState("");
  const [nameError, setNameError] = useState("");
  const [activeTenant, setActiveTenant] = useState(tenantSlug || "");

  const { data: tenants } = useTenants();

  // Keep in sync when parent tenantSlug changes (normal user login).
  useEffect(() => { if (tenantSlug) setActiveTenant(tenantSlug); }, [tenantSlug]);

  const effectiveTenant = activeTenant || undefined;

  const [qrChannel, setQrChannel] = useState<WhatsAppChannel | null>(null);

  const listQuery = useListWhatsAppChannels(effectiveTenant);
  const createMut = useCreateWhatsAppChannel(effectiveTenant);
  const deleteMut = useDeleteWhatsAppChannel(effectiveTenant);
  const profilesQuery = useListConversationProfiles();

  const handleConnect = async () => {
    if (!displayName.trim()) {
      setNameError("Nome de exibição é obrigatório.");
      return;
    }
    if (!profileId) {
      toast.error("Selecione um perfil.");
      return;
    }
    setNameError("");
    try {
      await createMut.mutateAsync({ display_name: displayName.trim(), profile_id: profileId });
      toast.success("Instância WhatsApp criada. Escaneie o QR para conectar.");
      setDisplayName("");
      setProfileId("");
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || err}`);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Remover número WhatsApp",
      message: "Esta instância será desconectada e removida permanentemente.",
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Número removido.");
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || err}`);
    }
  };

  const handleConnected = () => {
    setQrChannel(null);
    toast.success("WhatsApp conectado!");
    void listQuery.refetch();
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Super admin tenant selector */}
      {isSuper && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>Tenant:</span>
          <select
            className="search-input"
            value={activeTenant}
            onChange={(e) => setActiveTenant(e.target.value)}
            style={{ maxWidth: 320 }}
            aria-label="Selecionar tenant"
          >
            <option value="">— selecione um tenant —</option>
            {(tenants || []).map((t: any) => (
              <option key={t.id} value={t.slug}>{t.name} ({t.slug})</option>
            ))}
          </select>
        </div>
      )}

      {/* Require tenant before showing anything else */}
      {!effectiveTenant ? (
        <div className="card" style={{ padding: 18 }}>
          <p className="muted" style={{ fontSize: 13 }}>
            {isSuper ? "Selecione um tenant acima para gerenciar canais WhatsApp." : "Tenant não identificado."}
          </p>
        </div>
      ) : (
      <>
      {/* Add form */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Adicionar número WhatsApp</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 180px" }}>
            <input
              className="search-input"
              placeholder="Nome de exibição (obrigatório)"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setNameError(""); }}
              aria-label="Nome de exibição"
              style={nameError ? { borderColor: "var(--err)" } : undefined}
            />
            {nameError && <div style={{ color: "var(--err)", fontSize: 11 }}>{nameError}</div>}
          </div>
          <select
            className="search-input"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            aria-label="Perfil de conversa"
            style={{ flex: "1 1 180px" }}
          >
            <option value="">— Selecione um perfil —</option>
            {(profilesQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.description || p.id}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn primary"
            onClick={handleConnect}
            disabled={createMut.isPending}
            style={{ whiteSpace: "nowrap" }}
          >
            {createMut.isPending ? "Criando…" : "Conectar"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
          Seus números WhatsApp
        </div>
        {listQuery.isLoading && (
          <div className="muted" style={{ padding: 20, textAlign: "center" }}>Carregando…</div>
        )}
        {listQuery.error && (
          <div style={{ color: "var(--err)", fontSize: 13, padding: 16 }}>
            {(listQuery.error as Error).message}
          </div>
        )}
        {listQuery.data && listQuery.data.length === 0 && (
          <div className="muted" style={{ padding: 20, textAlign: "center" }}>
            Nenhum número conectado. Adicione um acima para começar.
          </div>
        )}
        {listQuery.data && listQuery.data.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={thStyle}>Nome / Instância</th>
                  <th style={thStyle}>Telefone</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Atualizado</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {listQuery.data.map((ch) => (
                  <WhatsAppRow
                    key={ch.id}
                    ch={ch}
                    tenantSlug={tenantSlug}
                    onQR={setQrChannel}
                    onDelete={handleDelete}
                    busy={deleteMut.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {qrChannel && (
        <QRModal
          channel={qrChannel}
          tenantSlug={effectiveTenant}
          onClose={() => setQrChannel(null)}
          onConnected={handleConnected}
        />
      )}
      </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ChannelsPage() {
  const { activeTenantSlug, isSuper } = useAuth();
  const tenantSlug = activeTenantSlug || undefined;

  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<"whatsapp" | "credentials" | "links">("whatsapp");

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

  const tabLabels: Record<typeof tab, string> = {
    whatsapp: "WhatsApp",
    credentials: "Credenciais",
    links: "Vínculos",
  };

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }} />
        {tab === "credentials" && (
          <button type="button" className="btn primary" onClick={() => setShowCredForm(true)}>
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
          {(["whatsapp", "credentials", "links"] as const).map((t) => (
            <button
              type="button"
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
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {tab === "whatsapp" && (
          <WhatsAppPanel tenantSlug={tenantSlug} isSuper={isSuper} />
        )}

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
                  Credenciais anteriores são omitidas por segurança {"—"} recadastre para rotacionar.
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
                aria-label="Canal da credencial"
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
                aria-label="Integração (opcional)"
              />
              <input
                className="search-input"
                placeholder="Webhook URL (obrigatório)"
                value={credWebhook}
                onChange={(e) => setCredWebhook(e.target.value)}
                aria-label="Webhook URL"
              />
              <input
                className="search-input"
                type="password"
                placeholder="Token (write-only)"
                value={credToken}
                onChange={(e) => setCredToken(e.target.value)}
                autoComplete="new-password"
                aria-label="Token de autenticação"
              />
              <select
                className="search-input"
                value={credAuthMode}
                onChange={(e) => setCredAuthMode(e.target.value as AuthMode)}
                aria-label="Modo de autenticação"
              >
                <option value="bearer">Bearer</option>
                <option value="x-header">X-Header</option>
                <option value="dual">Dual (bearer + x-header)</option>
                <option value="none">Nenhum</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" className="btn" onClick={() => setShowCredForm(false)}>Cancelar</button>
              <button
                type="button"
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
