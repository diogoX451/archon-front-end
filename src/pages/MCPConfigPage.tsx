import { useCallback, useState } from "react";
import { useAuth } from "@app/auth-context";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useToast, useConfirm } from "@shared/ui/feedback";
import {
  listMCPConfigs,
  upsertMCPConfig,
  deleteMCPConfig,
} from "@shared/api/mcpConfig";
import type {
  MCPConfig,
  MCPTransport,
  UpsertMCPConfigInput,
} from "@shared/api/mcpConfig";
import { IconPlus } from "@shared/ui/icons/Icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenants } from "@shared/hooks/useTenants";

const TRANSPORTS: { value: MCPTransport; label: string; tone: string }[] = [
  { value: "streamable_http", label: "Streamable HTTP", tone: "ok" },
  { value: "sse", label: "SSE (legado)", tone: "warn" },
];

interface FormState {
  name: string;
  transport: MCPTransport;
  url: string;
  auth_token: string;
  enabled: boolean;
}

const emptyForm = (): FormState => ({
  name: "",
  transport: "streamable_http",
  url: "",
  auth_token: "",
  enabled: true,
});

function TransportPill({ transport }: { transport: MCPTransport }) {
  const meta = TRANSPORTS.find((t) => t.value === transport);
  return (
    <span className="pill" data-tone={meta?.tone ?? ""}>
      {meta?.label ?? transport}
    </span>
  );
}

function ConfigRow({
  cfg,
  onDelete,
  busy,
}: {
  cfg: MCPConfig;
  onDelete: (name: string) => void;
  busy: boolean;
}) {
  return (
    <tr>
      <td className="mono" style={{ fontWeight: 600 }}>{cfg.name}</td>
      <td>
        <TransportPill transport={cfg.transport} />
      </td>
      <td className="mono muted" style={{ wordBreak: "break-all" }}>{cfg.url}</td>
      <td>
        <span className="pill" data-tone="ok" style={{ fontSize: 13 }}>
          ••••
        </span>
      </td>
      <td>
        <span
          className="pill"
          data-tone={cfg.enabled ? "ok" : "warn"}
          style={{ fontSize: 13 }}
        >
          {cfg.enabled ? "ativo" : "desativado"}
        </span>
      </td>
      <td className="muted" style={{ fontSize: 14 }}>
        {new Date(cfg.updated_at).toLocaleString()}
      </td>
      <td>
        <button
          className="btn"
          style={{ color: "var(--err)", fontSize: 14 }}
          disabled={busy}
          onClick={() => onDelete(cfg.name)}
        >
          Remover
        </button>
      </td>
    </tr>
  );
}

export function MCPConfigPage() {
  const { isSuper, activeTenantSlug } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [busyName, setBusyName] = useState<string | null>(null);

  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const { data: tenants } = useTenants();
  const effectiveTenant = isSuper ? selectedTenant || undefined : activeTenantSlug || undefined;

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["mcp-configs", effectiveTenant],
    queryFn: () => listMCPConfigs(effectiveTenant),
    retry: 1,
  });

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

  const handleDelete = useCallback(
    async (name: string) => {
      const ok = await confirm({
        title: "Remover MCP server",
        message: `Remover o MCP "${name}"? Agentes que dependem desse servidor pararão de funcionar até que ele seja recadastrado.`,
        confirmLabel: "Remover",
      });
      if (!ok) return;
      setBusyName(name);
      deleteMut.mutate(name, { onSettled: () => setBusyName(null) });
    },
    [confirm, deleteMut],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim().toLowerCase();
    const url = form.url.trim();
    if (!name) {
      toast.error("Nome é obrigatório.");
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(name)) {
      toast.error("Nome aceita apenas letras minúsculas, números, '-' e '_'.");
      return;
    }
    if (!url) {
      toast.error("URL é obrigatória.");
      return;
    }
    upsertMut.mutate({
      name,
      transport: form.transport,
      url,
      auth_token: form.auth_token.trim() || undefined,
      enabled: form.enabled,
      tenant_slug: effectiveTenant,
    });
  };

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div className="grow" />
        {isSuper && (
          <select
            className="field-select"
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            style={{ width: 220 }}
          >
            <option value="">Selecione um tenant</option>
            {(tenants || []).map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
        )}
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>
          <IconPlus size={14} />
          {showForm ? "Cancelar" : "Novo MCP server"}
        </button>
      </div>

      <div className="page-body">
        <div className="section-head" style={{ marginTop: 0 }}>
          <div>
            <h1 className="page-h1">MCP Servers</h1>
            <p className="page-lead" style={{ marginBottom: 0 }}>
              Servidores MCP (Model Context Protocol) cadastrados por tenant. As tools
              expostas por cada servidor ficam disponíveis automaticamente para os
              agentes ReAct do tenant.
            </p>
          </div>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 28, padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>
              Novo / Atualizar MCP server
            </h3>
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="field-label">Nome</span>
                  <input
                    className="field-input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="ex: erp, crm, slack"
                    required
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="field-label">Transport</span>
                  <select
                    className="field-select"
                    value={form.transport}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, transport: e.target.value as MCPTransport }))
                    }
                  >
                    {TRANSPORTS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    gridColumn: "1 / -1",
                  }}
                >
                  <span className="field-label">URL</span>
                  <input
                    className="field-input"
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://meu-mcp.example.com/mcp"
                    required
                  />
                </label>

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    gridColumn: "1 / -1",
                  }}
                >
                  <span className="field-label">
                    Auth token{" "}
                    <span className="muted" style={{ fontWeight: 400 }}>
                      (opcional — enviado como Authorization: Bearer)
                    </span>
                  </span>
                  <input
                    className="field-input"
                    type="password"
                    value={form.auth_token}
                    onChange={(e) => setForm((f) => ({ ...f, auth_token: e.target.value }))}
                    placeholder="vazio = sem auth / manter existente"
                    autoComplete="new-password"
                  />
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    gridColumn: "1 / -1",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                  />
                  <span className="field-label" style={{ margin: 0 }}>
                    Habilitado
                  </span>
                </label>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn primary" type="submit" disabled={upsertMut.isPending}>
                  {upsertMut.isPending ? "Salvando..." : "Salvar"}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm(emptyForm());
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <p className="muted">Carregando...</p>
        ) : configs.length === 0 ? (
          <div className="empty-state">
            <div className="big">Nenhum MCP server cadastrado</div>
            Cadastre um servidor para que os agentes possam consumir suas tools.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Transport</th>
                  <th>URL</th>
                  <th>Token</th>
                  <th>Status</th>
                  <th>Atualizado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((cfg) => (
                  <ConfigRow
                    key={cfg.name}
                    cfg={cfg}
                    onDelete={handleDelete}
                    busy={busyName === cfg.name || deleteMut.isPending}
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
