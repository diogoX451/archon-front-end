import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@app/auth-context";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useToast, useConfirm } from "@shared/ui/feedback";
import {
  deleteMCPConfig,
  getMCPOAuthStatus,
  issueMCPClientCredentials,
  listMCPConfigs,
  refreshMCPOAuthDiscovery,
  refreshMCPOAuthSubject,
  registerMCPOAuthClient,
  revokeMCPOAuthSubject,
  startMCPOAuth,
  upsertMCPConfig,
} from "@shared/api/mcpConfig";
import type {
  MCPAuthMode,
  MCPConfig,
  MCPProviderPreset,
  MCPTransport,
  OAuthSubjectStatus,
  UpsertMCPConfigInput,
} from "@shared/api/mcpConfig";
import { IconPlus } from "@shared/ui/icons/Icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenants } from "@shared/hooks/useTenants";

const TRANSPORTS: { value: MCPTransport; label: string; tone: string }[] = [
  { value: "streamable_http", label: "Streamable HTTP", tone: "ok" },
  { value: "sse", label: "SSE (legado)", tone: "warn" },
];

const AUTH_MODES: { value: MCPAuthMode; label: string; hint: string }[] = [
  { value: "none", label: "Sem auth", hint: "MCP publico ou rede confiavel." },
  { value: "static_bearer", label: "Bearer estatico", hint: "Compatibilidade com token manual." },
  { value: "oauth2_authorization_code", label: "OAuth Authorization Code", hint: "Conta de usuario via browser + PKCE." },
  { value: "oauth2_client_credentials", label: "OAuth Client Credentials", hint: "Service-to-service sem browser." },
];

interface FormState {
  name: string;
  transport: MCPTransport;
  url: string;
  auth_mode: MCPAuthMode;
  static_token: string;
  preset: MCPProviderPreset;
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint: string;
  registration_endpoint: string;
  discovery_url: string;
  client_id: string;
  client_secret: string;
  dynamic_registration: boolean;
  scopes: string;
  audience: string;
  redirect_uri: string;
  use_pkce: boolean;
  subject_from_id_token: boolean;
  userinfo_endpoint: string;
  oauth_subject: string;
  tool_required_scopes: string;
  enabled: boolean;
}

const emptyForm = (): FormState => ({
  name: "",
  transport: "streamable_http",
  url: "",
  auth_mode: "none",
  static_token: "",
  preset: "",
  issuer: "",
  authorization_endpoint: "",
  token_endpoint: "",
  revocation_endpoint: "",
  registration_endpoint: "",
  discovery_url: "",
  client_id: "",
  client_secret: "",
  dynamic_registration: false,
  scopes: "",
  audience: "",
  redirect_uri: "",
  use_pkce: true,
  subject_from_id_token: false,
  userinfo_endpoint: "",
  oauth_subject: "",
  tool_required_scopes: "",
  enabled: true,
});

function csvToList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function listToText(value?: string[]): string {
  return (value || []).join("\n");
}

function authModeLabel(mode?: string): string {
  return AUTH_MODES.find((m) => m.value === mode)?.label || mode || "Sem auth";
}

function authTone(mode?: string): string {
  if (mode === "oauth2_authorization_code" || mode === "oauth2_client_credentials") return "ok";
  if (mode === "static_bearer") return "warn";
  return "";
}

function safeJSON(value: unknown): string {
  if (!value) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function parseToolScopes(raw: string): Record<string, string[]> | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("tool_required_scopes deve ser um objeto JSON.");
  }
  const out: Record<string, string[]> = {};
  for (const [tool, scopes] of Object.entries(parsed as Record<string, unknown>)) {
    if (!Array.isArray(scopes)) throw new Error(`Scopes de ${tool} devem ser uma lista.`);
    out[tool] = scopes.map(String).map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

function formFromConfig(cfg: MCPConfig): FormState {
  const auth = cfg.auth;
  const o2 = auth?.oauth2;
  const metadata = cfg.metadata || {};
  return {
    name: cfg.name,
    transport: cfg.transport,
    url: cfg.url,
    auth_mode: auth?.mode || (cfg.auth_token ? "static_bearer" : "none"),
    static_token: "",
    preset: (o2?.preset || "") as MCPProviderPreset,
    issuer: o2?.issuer || "",
    authorization_endpoint: o2?.authorization_endpoint || "",
    token_endpoint: o2?.token_endpoint || "",
    revocation_endpoint: o2?.revocation_endpoint || "",
    registration_endpoint: o2?.registration_endpoint || "",
    discovery_url: o2?.discovery_url || "",
    client_id: o2?.client_id || "",
    client_secret: "",
    dynamic_registration: !!o2?.dynamic_registration,
    scopes: listToText(o2?.scopes),
    audience: o2?.audience || "",
    redirect_uri: o2?.redirect_uri || "",
    use_pkce: o2?.use_pkce ?? true,
    subject_from_id_token: !!o2?.subject_from_id_token,
    userinfo_endpoint: o2?.userinfo_endpoint || "",
    oauth_subject: typeof metadata.oauth_subject === "string" ? metadata.oauth_subject : "",
    tool_required_scopes: safeJSON(metadata.tool_required_scopes || metadata.required_scopes),
    enabled: cfg.enabled,
  };
}

function TransportPill({ transport }: { transport: MCPTransport }) {
  const meta = TRANSPORTS.find((t) => t.value === transport);
  return (
    <span className="pill" data-tone={meta?.tone ?? ""}>
      {meta?.label ?? transport}
    </span>
  );
}

function SubjectList({ subjects, onRefresh, onRevoke, busySubject }: {
  subjects: OAuthSubjectStatus[];
  onRefresh: (subject: string) => void;
  onRevoke: (subject: string) => void;
  busySubject: string | null;
}) {
  if (subjects.length === 0) {
    return <div className="muted" style={{ fontSize: 13 }}>Nenhuma conta OAuth conectada.</div>;
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {subjects.map((s) => (
        <div key={s.subject} className="card" style={{ padding: 12, borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div>
              <div className="mono" style={{ fontWeight: 700 }}>{s.display_name || s.subject}</div>
              <div className="muted" style={{ fontSize: 12 }}>{s.subject}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                Expira: {s.expires_at ? new Date(s.expires_at).toLocaleString() : "n/a"}
                {s.needs_reauth ? " · precisa reconectar" : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="btn" disabled={busySubject === s.subject} onClick={() => onRefresh(s.subject)}>Refresh</button>
              <button type="button" className="btn" style={{ color: "var(--err)" }} disabled={busySubject === s.subject} onClick={() => onRevoke(s.subject)}>Revogar</button>
            </div>
          </div>
          {(s.scopes_granted || []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {(s.scopes_granted || []).map((scope) => <span key={scope} className="pill" style={{ fontSize: 12 }}>{scope}</span>)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function OAuthStatusPanel({ cfg, onConnect, onClientCredentials, onRefreshDiscovery, onRegister, onRefreshSubject, onRevokeSubject, busyAction, busySubject }: {
  cfg: MCPConfig;
  onConnect: (cfg: MCPConfig) => void;
  onClientCredentials: (cfg: MCPConfig) => void;
  onRefreshDiscovery: (cfg: MCPConfig) => void;
  onRegister: (cfg: MCPConfig) => void;
  onRefreshSubject: (cfg: MCPConfig, subject: string) => void;
  onRevokeSubject: (cfg: MCPConfig, subject: string) => void;
  busyAction: string | null;
  busySubject: string | null;
}) {
  const mode = cfg.auth?.mode;
  const isOAuth = mode === "oauth2_authorization_code" || mode === "oauth2_client_credentials";
  const { data, isLoading, isError } = useQuery({
    queryKey: ["mcp-oauth-status", cfg.id],
    queryFn: () => getMCPOAuthStatus(cfg.id),
    enabled: isOAuth && !!cfg.id,
    retry: 1,
  });

  if (!isOAuth) return <span className="muted" style={{ fontSize: 13 }}>n/a</span>;

  return (
    <div style={{ minWidth: 320, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {mode === "oauth2_authorization_code" && <button type="button" className="btn" disabled={busyAction === cfg.id} onClick={() => onConnect(cfg)}>Conectar conta</button>}
        {mode === "oauth2_client_credentials" && <button type="button" className="btn" disabled={busyAction === cfg.id} onClick={() => onClientCredentials(cfg)}>Gerar token service</button>}
        <button type="button" className="btn" disabled={busyAction === cfg.id} onClick={() => onRefreshDiscovery(cfg)}>Discovery</button>
        <button type="button" className="btn" disabled={busyAction === cfg.id} onClick={() => onRegister(cfg)}>DCR</button>
      </div>
      {isLoading ? (
        <div className="muted" style={{ fontSize: 13 }}>Carregando status OAuth…</div>
      ) : isError ? (
        <div className="muted" style={{ fontSize: 13 }}>Status OAuth indisponivel.</div>
      ) : (
        <SubjectList
          subjects={data?.subjects || []}
          busySubject={busySubject}
          onRefresh={(subject) => onRefreshSubject(cfg, subject)}
          onRevoke={(subject) => onRevokeSubject(cfg, subject)}
        />
      )}
    </div>
  );
}

function ConfigRow({
  cfg,
  onEdit,
  onDelete,
  onConnect,
  onClientCredentials,
  onRefreshDiscovery,
  onRegister,
  onRefreshSubject,
  onRevokeSubject,
  busyName,
  busyAction,
  busySubject,
}: {
  cfg: MCPConfig;
  onEdit: (cfg: MCPConfig) => void;
  onDelete: (name: string) => void;
  onConnect: (cfg: MCPConfig) => void;
  onClientCredentials: (cfg: MCPConfig) => void;
  onRefreshDiscovery: (cfg: MCPConfig) => void;
  onRegister: (cfg: MCPConfig) => void;
  onRefreshSubject: (cfg: MCPConfig, subject: string) => void;
  onRevokeSubject: (cfg: MCPConfig, subject: string) => void;
  busyName: string | null;
  busyAction: string | null;
  busySubject: string | null;
}) {
  const mode = cfg.auth?.mode || (cfg.auth_token ? "static_bearer" : "none");
  return (
    <tr>
      <td className="mono" style={{ fontWeight: 600 }}>{cfg.name}</td>
      <td><TransportPill transport={cfg.transport} /></td>
      <td className="mono muted" style={{ wordBreak: "break-all" }}>{cfg.url}</td>
      <td><span className="pill" data-tone={authTone(mode)} style={{ fontSize: 13 }}>{authModeLabel(mode)}</span></td>
      <td>
        <OAuthStatusPanel
          cfg={cfg}
          busyAction={busyAction}
          busySubject={busySubject}
          onConnect={onConnect}
          onClientCredentials={onClientCredentials}
          onRefreshDiscovery={onRefreshDiscovery}
          onRegister={onRegister}
          onRefreshSubject={onRefreshSubject}
          onRevokeSubject={onRevokeSubject}
        />
      </td>
      <td><span className="pill" data-tone={cfg.enabled ? "ok" : "warn"} style={{ fontSize: 13 }}>{cfg.enabled ? "ativo" : "desativado"}</span></td>
      <td className="muted" style={{ fontSize: 14 }}>{new Date(cfg.updated_at).toLocaleString()}</td>
      <td>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="btn" disabled={busyName === cfg.name} onClick={() => onEdit(cfg)}>Editar</button>
          <button type="button" className="btn" style={{ color: "var(--err)", fontSize: 14 }} disabled={busyName === cfg.name} onClick={() => onDelete(cfg.name)}>Remover</button>
        </div>
      </td>
    </tr>
  );
}

export function MCPOAuthResultPage({ kind }: { kind: "connected" | "error" }) {
  const [params] = useSearchParams();
  const id = params.get("id");
  const code = params.get("code");
  return (
    <div className="page-body">
      <div className="card" style={{ maxWidth: 760, padding: 28 }}>
        <h1 className="page-h1" style={{ marginTop: 0 }}>
          {kind === "connected" ? "MCP OAuth conectado" : "Falha ao conectar MCP OAuth"}
        </h1>
        <p className="page-lead">
          {kind === "connected"
            ? "A conta foi autorizada e o token foi salvo no Archon. Volte para MCP Servers para conferir subjects e scopes."
            : `O provider retornou erro${code ? `: ${code}` : ""}. Refaça a conexao ou valide a configuracao OAuth.`}
        </p>
        {id && <p className="mono muted">config_id: {id}</p>}
        <Link className="btn primary" to="/mcp-config">Voltar para MCP Servers</Link>
      </div>
    </div>
  );
}

export function MCPConfigPage() {
  const { user, isSuper, activeTenantSlug } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [busyName, setBusyName] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [busySubject, setBusySubject] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>("");

  const { data: tenants } = useTenants();
  const effectiveTenant = isSuper ? selectedTenant || undefined : activeTenantSlug || undefined;
  const canLoadTenant = !isSuper || !!effectiveTenant;

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["mcp-configs", effectiveTenant],
    queryFn: () => listMCPConfigs(effectiveTenant),
    enabled: canLoadTenant,
    retry: 1,
  });

  const selectedMode = useMemo(() => AUTH_MODES.find((m) => m.value === form.auth_mode), [form.auth_mode]);

  const upsertMut = useMutation({
    mutationFn: (input: UpsertMCPConfigInput) => upsertMCPConfig(input, effectiveTenant),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-configs"] });
      toast.success("MCP server salvo.");
      setShowForm(false);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (name: string) => deleteMCPConfig(name, effectiveTenant),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-configs"] });
      toast.success("MCP server removido.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refreshAfterOAuthAction = (configID: string) => {
    qc.invalidateQueries({ queryKey: ["mcp-configs"] });
    qc.invalidateQueries({ queryKey: ["mcp-oauth-status", configID] });
  };

  const startMut = useMutation({
    mutationFn: (cfg: MCPConfig) => startMCPOAuth(cfg.id, { initiator_user_id: user?.id || "admin" }),
    onSuccess: (out) => {
      window.location.assign(out.authorize_url);
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusyAction(null),
  });

  const clientCredsMut = useMutation({
    mutationFn: (cfg: MCPConfig) => issueMCPClientCredentials(cfg.id),
    onSuccess: (_out, cfg) => {
      toast.success("Token service gerado.");
      refreshAfterOAuthAction(cfg.id);
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusyAction(null),
  });

  const discoveryMut = useMutation({
    mutationFn: (cfg: MCPConfig) => refreshMCPOAuthDiscovery(cfg.id),
    onSuccess: (_out, cfg) => {
      toast.success("Discovery OAuth atualizado.");
      refreshAfterOAuthAction(cfg.id);
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusyAction(null),
  });

  const registerMut = useMutation({
    mutationFn: (cfg: MCPConfig) => registerMCPOAuthClient(cfg.id),
    onSuccess: (_out, cfg) => {
      toast.success("Client OAuth registrado.");
      refreshAfterOAuthAction(cfg.id);
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusyAction(null),
  });

  const refreshSubjectMut = useMutation({
    mutationFn: ({ cfg, subject }: { cfg: MCPConfig; subject: string }) => refreshMCPOAuthSubject(cfg.id, subject),
    onSuccess: (_out, vars) => {
      toast.success("Subject atualizado.");
      refreshAfterOAuthAction(vars.cfg.id);
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusySubject(null),
  });

  const revokeSubjectMut = useMutation({
    mutationFn: ({ cfg, subject }: { cfg: MCPConfig; subject: string }) => revokeMCPOAuthSubject(cfg.id, subject),
    onSuccess: (_out, vars) => {
      toast.success("Subject revogado.");
      refreshAfterOAuthAction(vars.cfg.id);
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusySubject(null),
  });

  const handleDelete = useCallback(async (name: string) => {
    const ok = await confirm({
      title: "Remover MCP server",
      message: `Remover o MCP "${name}"? Agentes que dependem desse servidor pararão de funcionar ate que ele seja recadastrado.`,
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!ok) return;
    setBusyName(name);
    deleteMut.mutate(name, { onSettled: () => setBusyName(null) });
  }, [confirm, deleteMut]);

  const handleEdit = (cfg: MCPConfig) => {
    setForm(formFromConfig(cfg));
    setShowForm(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim().toLowerCase();
    const url = form.url.trim();
    if (!name) return toast.error("Nome e obrigatorio.");
    if (!/^[a-z0-9_-]+$/.test(name)) return toast.error("Nome aceita apenas letras minusculas, numeros, '-' e '_'.");
    if (!url) return toast.error("URL e obrigatoria.");
    if (form.auth_mode === "static_bearer" && !form.static_token.trim()) {
      return toast.error("Informe o bearer token ao salvar auth estatico. Tokens redigidos nao podem ser preservados pelo frontend.");
    }

    let toolScopes: Record<string, string[]> | undefined;
    try {
      toolScopes = parseToolScopes(form.tool_required_scopes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "JSON de scopes invalido.");
      return;
    }

    const metadata: Record<string, unknown> = {};
    if (form.oauth_subject.trim()) metadata.oauth_subject = form.oauth_subject.trim();
    if (toolScopes) metadata.tool_required_scopes = toolScopes;

    const input: UpsertMCPConfigInput = {
      name,
      transport: form.transport,
      url,
      enabled: form.enabled,
      metadata: Object.keys(metadata).length ? metadata : undefined,
      tenant_slug: effectiveTenant,
      auth: { mode: form.auth_mode },
    };

    if (form.auth_mode === "static_bearer") {
      input.auth = { mode: "static_bearer", static_bearer: { token: form.static_token.trim() } };
    }
    if (form.auth_mode === "oauth2_authorization_code" || form.auth_mode === "oauth2_client_credentials") {
      input.auth = {
        mode: form.auth_mode,
        oauth2: {
          preset: form.preset || undefined,
          issuer: form.issuer.trim() || undefined,
          authorization_endpoint: form.authorization_endpoint.trim() || undefined,
          token_endpoint: form.token_endpoint.trim() || undefined,
          revocation_endpoint: form.revocation_endpoint.trim() || undefined,
          registration_endpoint: form.registration_endpoint.trim() || undefined,
          discovery_url: form.discovery_url.trim() || undefined,
          client_id: form.client_id.trim() || undefined,
          client_secret: form.client_secret.trim() || undefined,
          dynamic_registration: form.dynamic_registration,
          scopes: csvToList(form.scopes),
          audience: form.audience.trim() || undefined,
          redirect_uri: form.redirect_uri.trim() || undefined,
          use_pkce: form.auth_mode === "oauth2_authorization_code" ? form.use_pkce : false,
          subject_from_id_token: form.subject_from_id_token || undefined,
          userinfo_endpoint: form.userinfo_endpoint.trim() || undefined,
        },
      };
    }

    upsertMut.mutate(input);
  };

  const handleConnect = (cfg: MCPConfig) => {
    setBusyAction(cfg.id);
    startMut.mutate(cfg);
  };

  const handleClientCredentials = (cfg: MCPConfig) => {
    setBusyAction(cfg.id);
    clientCredsMut.mutate(cfg);
  };

  const handleRefreshDiscovery = (cfg: MCPConfig) => {
    setBusyAction(cfg.id);
    discoveryMut.mutate(cfg);
  };

  const handleRegister = (cfg: MCPConfig) => {
    setBusyAction(cfg.id);
    registerMut.mutate(cfg);
  };

  const handleRefreshSubject = (cfg: MCPConfig, subject: string) => {
    setBusySubject(subject);
    refreshSubjectMut.mutate({ cfg, subject });
  };

  const handleRevokeSubject = async (cfg: MCPConfig, subject: string) => {
    const ok = await confirm({
      title: "Revogar conta OAuth",
      message: `Revogar o subject "${subject}" deste MCP?`,
      confirmLabel: "Revogar",
      destructive: true,
    });
    if (!ok) return;
    setBusySubject(subject);
    revokeSubjectMut.mutate({ cfg, subject });
  };

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div className="grow" />
        {isSuper && (
          <select className="field-select" value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)} style={{ width: 220 }}>
            <option value="">Selecione um tenant</option>
            {(tenants || []).map((t) => <option key={t.id} value={t.slug}>{t.name} ({t.slug})</option>)}
          </select>
        )}
        <button type="button" className="btn primary" onClick={() => setShowForm(!showForm)} disabled={isSuper && !effectiveTenant}>
          <IconPlus size={14} />
          {showForm ? "Cancelar" : "Novo MCP server"}
        </button>
      </div>

      <div className="page-body">
        <div className="section-head" style={{ marginTop: 0 }}>
          <div>
            <h1 className="page-h1">MCP Servers</h1>
            <p className="page-lead" style={{ marginBottom: 0 }}>
              Registry MCP por tenant, com suporte a sem auth, bearer estatico e OAuth 2.1. Configure o servidor uma vez; agentes resolvem URL, auth, subject e scopes em runtime.
            </p>
          </div>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 28, padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>Novo / Atualizar MCP server</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="field-label">Nome</span>
                  <input className="field-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="ex: google, github, crm" required aria-label="Nome do MCP server" />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="field-label">Transport</span>
                  <select className="field-select" value={form.transport} onChange={(e) => setForm((f) => ({ ...f, transport: e.target.value as MCPTransport }))} aria-label="Transport do MCP server">
                    {TRANSPORTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                  <span className="field-label">URL</span>
                  <input className="field-input" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://meu-mcp.example.com/mcp" required aria-label="URL do MCP server" />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="field-label">Modo de auth</span>
                  <select className="field-select" value={form.auth_mode} onChange={(e) => setForm((f) => ({ ...f, auth_mode: e.target.value as MCPAuthMode }))} aria-label="Modo de autenticação">
                    {AUTH_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  {selectedMode && <span className="field-hint">{selectedMode.hint}</span>}
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 28 }}>
                  <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} aria-label="Habilitado" />
                  <span className="field-label" style={{ margin: 0 }}>Habilitado</span>
                </label>

                {form.auth_mode === "static_bearer" && (
                  <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                    <span className="field-label">Bearer token</span>
                    <input className="field-input" type="password" value={form.static_token} onChange={(e) => setForm((f) => ({ ...f, static_token: e.target.value }))} placeholder="Token enviado como Authorization: Bearer" autoComplete="new-password" aria-label="Bearer token" />
                  </label>
                )}

                {(form.auth_mode === "oauth2_authorization_code" || form.auth_mode === "oauth2_client_credentials") && (
                  <>
                    <div className="section-title" style={{ gridColumn: "1 / -1", marginTop: 8 }}>OAuth 2.1</div>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="field-label">Preset</span>
                      <select className="field-select" value={form.preset} onChange={(e) => setForm((f) => ({ ...f, preset: e.target.value as MCPProviderPreset }))} aria-label="Preset do provedor OAuth">
                        <option value="">Manual</option>
                        <option value="google">Google</option>
                        <option value="github">GitHub</option>
                        <option value="microsoft">Microsoft</option>
                      </select>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="field-label">Client ID</span>
                      <input className="field-input" value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))} placeholder="Obrigatorio, exceto com DCR" aria-label="Client ID do OAuth" />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="field-label">Client secret</span>
                      <input className="field-input" type="password" value={form.client_secret} onChange={(e) => setForm((f) => ({ ...f, client_secret: e.target.value }))} placeholder="Confidential clients" autoComplete="new-password" aria-label="Client secret do OAuth" />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="field-label">Discovery URL</span>
                      <input className="field-input" value={form.discovery_url} onChange={(e) => setForm((f) => ({ ...f, discovery_url: e.target.value }))} placeholder="https://issuer/.well-known/oauth-authorization-server" aria-label="Discovery URL do OAuth" />
                    </label>
                    {form.auth_mode === "oauth2_authorization_code" && (
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span className="field-label">Authorization endpoint</span>
                        <input className="field-input" value={form.authorization_endpoint} onChange={(e) => setForm((f) => ({ ...f, authorization_endpoint: e.target.value }))} aria-label="Authorization endpoint" />
                      </label>
                    )}
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="field-label">Token endpoint</span>
                      <input className="field-input" value={form.token_endpoint} onChange={(e) => setForm((f) => ({ ...f, token_endpoint: e.target.value }))} aria-label="Token endpoint" />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="field-label">Revocation endpoint</span>
                      <input className="field-input" value={form.revocation_endpoint} onChange={(e) => setForm((f) => ({ ...f, revocation_endpoint: e.target.value }))} aria-label="Revocation endpoint" />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="field-label">Registration endpoint</span>
                      <input className="field-input" value={form.registration_endpoint} onChange={(e) => setForm((f) => ({ ...f, registration_endpoint: e.target.value }))} aria-label="Registration endpoint" />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="field-label">Issuer</span>
                      <input className="field-input" value={form.issuer} onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))} aria-label="Issuer do OAuth" />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="field-label">Audience / resource</span>
                      <input className="field-input" value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))} aria-label="Audience ou resource do OAuth" />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                      <span className="field-label">Scopes</span>
                      <textarea className="field-textarea" value={form.scopes} onChange={(e) => setForm((f) => ({ ...f, scopes: e.target.value }))} placeholder="openid\nemail\nhttps://www.googleapis.com/auth/gmail.readonly" aria-label="Scopes do OAuth" />
                      <span className="field-hint">Um por linha ou separados por virgula.</span>
                    </label>
                    {form.auth_mode === "oauth2_authorization_code" && (
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span className="field-label">Redirect URI override</span>
                        <input className="field-input" value={form.redirect_uri} onChange={(e) => setForm((f) => ({ ...f, redirect_uri: e.target.value }))} placeholder="Vazio usa callback padrao do Archon" aria-label="Redirect URI override" />
                      </label>
                    )}
                    <label style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 28 }}>
                      <input type="checkbox" checked={form.dynamic_registration} onChange={(e) => setForm((f) => ({ ...f, dynamic_registration: e.target.checked }))} aria-label="Dynamic Client Registration" />
                      <span className="field-label" style={{ margin: 0 }}>Dynamic Client Registration</span>
                    </label>
                    {form.auth_mode === "oauth2_authorization_code" && (
                      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={form.use_pkce} onChange={(e) => setForm((f) => ({ ...f, use_pkce: e.target.checked }))} aria-label="Usar PKCE" />
                        <span className="field-label" style={{ margin: 0 }}>Usar PKCE</span>
                      </label>
                    )}
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" checked={form.subject_from_id_token} onChange={(e) => setForm((f) => ({ ...f, subject_from_id_token: e.target.checked }))} aria-label="Subject do ID Token" />
                      <span className="field-label" style={{ margin: 0 }}>Subject do ID Token</span>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="field-label">Userinfo Endpoint</span>
                      <input className="field-input" value={form.userinfo_endpoint} onChange={(e) => setForm((f) => ({ ...f, userinfo_endpoint: e.target.value }))} placeholder="Preenchido automaticamente pelo preset" aria-label="Userinfo Endpoint" />
                      <span className="field-hint">URL para extrair subject/display name quando nao ha id_token.</span>
                    </label>
                  </>
                )}

                <div className="section-title" style={{ gridColumn: "1 / -1", marginTop: 8 }}>Runtime MCP</div>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="field-label">OAuth subject padrao</span>
                  <input className="field-input" value={form.oauth_subject} onChange={(e) => setForm((f) => ({ ...f, oauth_subject: e.target.value }))} placeholder="ex: suporte@empresa.com ou _service" aria-label="OAuth subject padrão" />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                  <span className="field-label">Scopes por tool</span>
                  <textarea className="field-textarea" value={form.tool_required_scopes} onChange={(e) => setForm((f) => ({ ...f, tool_required_scopes: e.target.value }))} placeholder={'{"gmail_send":["https://www.googleapis.com/auth/gmail.send"]}'} aria-label="Scopes por tool (JSON)" />
                  <span className="field-hint">JSON opcional salvo em metadata.tool_required_scopes; o executor valida antes da chamada.</span>
                </label>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn primary" type="submit" disabled={upsertMut.isPending}>{upsertMut.isPending ? "Salvando..." : "Salvar"}</button>
                <button className="btn" type="button" onClick={() => { setShowForm(false); setForm(emptyForm()); }}>Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {isSuper && !effectiveTenant ? (
          <div className="empty-state"><div className="big">Selecione um tenant</div>Escolha um tenant para listar e configurar MCP servers.</div>
        ) : isLoading ? (
          <p className="muted">Carregando…</p>
        ) : configs.length === 0 ? (
          <div className="empty-state"><div className="big">Nenhum MCP server cadastrado</div>Cadastre um servidor para que os agentes possam consumir suas tools.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Transport</th>
                  <th>URL</th>
                  <th>Auth</th>
                  <th>OAuth</th>
                  <th>Status</th>
                  <th>Atualizado</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((cfg) => (
                  <ConfigRow
                    key={cfg.name}
                    cfg={cfg}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onConnect={handleConnect}
                    onClientCredentials={handleClientCredentials}
                    onRefreshDiscovery={handleRefreshDiscovery}
                    onRegister={handleRegister}
                    onRefreshSubject={handleRefreshSubject}
                    onRevokeSubject={handleRevokeSubject}
                    busyName={busyName || (deleteMut.isPending ? cfg.name : null)}
                    busyAction={busyAction}
                    busySubject={busySubject}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
