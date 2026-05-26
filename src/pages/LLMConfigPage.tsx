import { useCallback, useState } from "react";
import { useAuth } from "@app/auth-context";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useToast, useConfirm } from "@shared/ui/feedback";
import { listLLMConfigs, upsertLLMConfig, deleteLLMConfig } from "@shared/api/llmConfig";
import type { LLMConfig, UpsertLLMConfigInput } from "@shared/api/llmConfig";
import { IconPlus } from "@shared/ui/icons/Icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenants } from "@shared/hooks/useTenants";
import {
  getUsageSummary,
  getUsageBreakdown,
  getUsagePricing,
  getUsageTimeseries,
} from "@shared/api/usage";
import type { UsageSummary, UsageBreakdownRow, PricingRow, UsageTimeseriesBucket } from "@shared/api/usage";

interface ProviderConfig {
  tone: string;
  defaultModel: string;
  staticModels: string[];
  requiresKey: boolean;
  fetchModels?: (apiKey: string, baseUrl: string) => Promise<string[]>;
}

const PROVIDER_REGISTRY: Record<string, ProviderConfig> = {
  openai: {
    tone: "",
    defaultModel: "gpt-4o-mini",
    staticModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini", "o3-mini"],
    requiresKey: true,
    fetchModels: async (apiKey) => {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}`);
      const data = await res.json();
      return (data.data as { id: string }[])
        .map((m) => m.id)
        .filter((id) => /^(gpt-|o1|o3|chatgpt)/.test(id))
        .sort();
    },
  },
  gemini: {
    tone: "ok",
    defaultModel: "gemini-2.0-flash-lite",
    staticModels: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
    requiresKey: true,
    fetchModels: async (apiKey) => {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      if (!res.ok) throw new Error(`Gemini ${res.status}`);
      const data = await res.json();
      return ((data.models || []) as { name: string; supportedGenerationMethods?: string[] }[])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace("models/", ""))
        .sort();
    },
  },
  ollama: {
    tone: "warn",
    defaultModel: "qwen2.5:7b",
    staticModels: ["qwen2.5:7b", "llama3:8b", "mistral:7b", "phi3:mini", "gemma3:4b"],
    requiresKey: false,
    fetchModels: async (_, baseUrl) => {
      const base = (baseUrl || "http://localhost:11434").replace(/\/$/, "");
      const res = await fetch(`${base}/api/tags`);
      if (!res.ok) throw new Error(`Ollama ${res.status}`);
      const data = await res.json();
      return ((data.models || []) as { name: string }[]).map((m) => m.name).sort();
    },
  },
};

const PROVIDERS = Object.keys(PROVIDER_REGISTRY);

interface FormState {
  provider: string;
  model: string;
  api_key: string;
  base_url: string;
}

const emptyForm = (): FormState => ({
  provider: "openai",
  model: PROVIDER_REGISTRY["openai"].defaultModel,
  api_key: "",
  base_url: "",
});

function ProviderPill({ provider }: { provider: string }) {
  return (
    <span className="pill" data-tone={PROVIDER_REGISTRY[provider]?.tone ?? ""}>
      {provider}
    </span>
  );
}

function ConfigRow({
  cfg,
  onDelete,
  busy,
}: {
  cfg: LLMConfig;
  onDelete: (provider: string) => void;
  busy: boolean;
}) {
  return (
    <tr>
      <td>
        <ProviderPill provider={cfg.provider} />
      </td>
      <td className="mono">{cfg.model}</td>
      <td className="muted">{cfg.base_url || "—"}</td>
      <td>
        <span
          className="pill"
          data-tone="ok"
          style={{ fontSize: 13 }}
        >
          ••••
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
          onClick={() => onDelete(cfg.provider)}
        >
          Remover
        </button>
      </td>
    </tr>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: "16px 20px", minWidth: 160 }}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function LLMAnalyticsTab({ tenantId }: { tenantId?: string }) {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const now = new Date();
  const daysBack = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const from = new Date(now.getTime() - daysBack * 86400_000).toISOString();
  const to = now.toISOString();

  const { data: summary, isLoading: loadingSum } = useQuery<UsageSummary>({
    queryKey: ["usage-summary", tenantId, period],
    queryFn: () => getUsageSummary({ from, to, ...(tenantId ? { tenant_id: tenantId } : {}) }),
    retry: 1,
  });

  const { data: byPurpose = [], isLoading: loadingPurpose } = useQuery<UsageBreakdownRow[]>({
    queryKey: ["usage-breakdown-purpose", tenantId, period],
    queryFn: () => getUsageBreakdown({ from, to, dimension: "purpose" }),
    retry: 1,
  });

  const { data: byProvider = [], isLoading: loadingProvider } = useQuery<UsageBreakdownRow[]>({
    queryKey: ["usage-breakdown-provider", tenantId, period],
    queryFn: () => getUsageBreakdown({ from, to, dimension: "provider" }),
    retry: 1,
  });

  const { data: tsData, isLoading: loadingTs } = useQuery<{ buckets: UsageTimeseriesBucket[] }>({
    queryKey: ["usage-timeseries", tenantId, period],
    queryFn: () => getUsageTimeseries({ from, to, bucket: "day", group_by: ["provider"] }),
    retry: 1,
  });

  const { data: pricing = [], isLoading: loadingPricing } = useQuery<PricingRow[]>({
    queryKey: ["usage-pricing"],
    queryFn: () => getUsagePricing({}),
    retry: 1,
    staleTime: 5 * 60_000,
  });

  const fmtNum = (n?: number) => n == null ? "—" : n.toLocaleString();
  const fmtCost = (n?: number) => n == null ? "—" : `$${n.toFixed(4)}`;
  const fmtPct = (n?: number) => n == null ? "—" : `${n.toFixed(1)}%`;
  const fmtMs = (n?: number) => n == null ? "—" : `${n.toFixed(0)} ms`;

  const totalCallsTs = tsData?.buckets.reduce(
    (acc, b) => acc + b.groups.reduce((s, g) => s + g.calls, 0),
    0
  ) ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="muted" style={{ fontSize: 13 }}>Período:</span>
        {(["7d", "30d", "90d"] as const).map((p) => (
          <button
            key={p}
            className={`btn${period === p ? " primary" : ""}`}
            style={{ fontSize: 13, padding: "4px 12px" }}
            onClick={() => setPeriod(p)}
          >
            {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
          </button>
        ))}
      </div>

      {loadingSum ? (
        <p className="muted">Carregando resumo...</p>
      ) : (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatCard label="Total de chamadas" value={fmtNum(summary?.calls)} />
          <StatCard label="Tokens de entrada" value={fmtNum(summary?.input_tokens)} />
          <StatCard label="Tokens de saída" value={fmtNum(summary?.output_tokens)} />
          <StatCard label="Tokens em cache" value={fmtNum(summary?.cached_tokens)} />
          <StatCard label="Custo total" value={fmtCost(summary?.cost_usd)} />
          <StatCard label="Latência média" value={fmtMs(summary?.avg_latency_ms)} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>Por finalidade</h3>
          {loadingPurpose ? (
            <p className="muted">Carregando...</p>
          ) : byPurpose.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>Sem dados no período.</p>
          ) : (
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Finalidade</th>
                  <th style={{ textAlign: "right" }}>Chamadas</th>
                  <th style={{ textAlign: "right" }}>% calls</th>
                  <th style={{ textAlign: "right" }}>Custo</th>
                  <th style={{ textAlign: "right" }}>% custo</th>
                </tr>
              </thead>
              <tbody>
                {byPurpose.map((row) => (
                  <tr key={row.dimension_value}>
                    <td className="mono">{row.dimension_value}</td>
                    <td style={{ textAlign: "right" }}>{fmtNum(row.calls)}</td>
                    <td style={{ textAlign: "right" }}>{fmtPct(row.pct_calls)}</td>
                    <td style={{ textAlign: "right" }}>{fmtCost(row.cost_usd)}</td>
                    <td style={{ textAlign: "right" }}>{fmtPct(row.pct_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>Por provider</h3>
          {loadingProvider ? (
            <p className="muted">Carregando...</p>
          ) : byProvider.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>Sem dados no período.</p>
          ) : (
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th style={{ textAlign: "right" }}>Chamadas</th>
                  <th style={{ textAlign: "right" }}>% calls</th>
                  <th style={{ textAlign: "right" }}>Custo</th>
                  <th style={{ textAlign: "right" }}>% custo</th>
                </tr>
              </thead>
              <tbody>
                {byProvider.map((row) => (
                  <tr key={row.dimension_value}>
                    <td><ProviderPill provider={row.dimension_value} /></td>
                    <td style={{ textAlign: "right" }}>{fmtNum(row.calls)}</td>
                    <td style={{ textAlign: "right" }}>{fmtPct(row.pct_calls)}</td>
                    <td style={{ textAlign: "right" }}>{fmtCost(row.cost_usd)}</td>
                    <td style={{ textAlign: "right" }}>{fmtPct(row.pct_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {!loadingTs && tsData && tsData.buckets.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600 }}>Evolução diária</h3>
          <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
            {totalCallsTs.toLocaleString()} chamadas no período
          </p>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th style={{ textAlign: "right" }}>Chamadas</th>
                  <th style={{ textAlign: "right" }}>Tokens in</th>
                  <th style={{ textAlign: "right" }}>Tokens out</th>
                  <th style={{ textAlign: "right" }}>Custo</th>
                </tr>
              </thead>
              <tbody>
                {tsData.buckets.map((bucket) => {
                  const calls = bucket.groups.reduce((s, g) => s + g.calls, 0);
                  const tin = bucket.groups.reduce((s, g) => s + g.input_tokens, 0);
                  const tout = bucket.groups.reduce((s, g) => s + g.output_tokens, 0);
                  const cost = bucket.groups.reduce((s, g) => s + g.cost_usd, 0);
                  return (
                    <tr key={bucket.ts}>
                      <td className="muted">{new Date(bucket.ts).toLocaleDateString()}</td>
                      <td style={{ textAlign: "right" }}>{calls.toLocaleString()}</td>
                      <td style={{ textAlign: "right" }}>{tin.toLocaleString()}</td>
                      <td style={{ textAlign: "right" }}>{tout.toLocaleString()}</td>
                      <td style={{ textAlign: "right" }}>{fmtCost(cost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>Tabela de preços</h3>
        {loadingPricing ? (
          <p className="muted">Carregando...</p>
        ) : pricing.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>Sem dados de pricing.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Model</th>
                  <th style={{ textAlign: "right" }}>Input / 1M</th>
                  <th style={{ textAlign: "right" }}>Output / 1M</th>
                  <th style={{ textAlign: "right" }}>Cache / 1M</th>
                  <th>Vigente desde</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map((row, i) => (
                  <tr key={i}>
                    <td><ProviderPill provider={row.provider} /></td>
                    <td className="mono">{row.model || <span className="muted">*</span>}</td>
                    <td style={{ textAlign: "right" }}>${row.input_per_1m_usd.toFixed(2)}</td>
                    <td style={{ textAlign: "right" }}>${row.output_per_1m_usd.toFixed(2)}</td>
                    <td style={{ textAlign: "right" }}>
                      {row.cached_input_per_1m != null ? `$${row.cached_input_per_1m.toFixed(2)}` : "—"}
                    </td>
                    <td className="muted">{new Date(row.effective_from).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function LLMConfigPage() {
  const { isSuper, activeTenantSlug } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"providers" | "analytics">("providers");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  const handleFetchModels = async () => {
    const cfg = PROVIDER_REGISTRY[form.provider];
    if (!cfg?.fetchModels) {
      toast.error("Provider sem suporte a busca de modelos.");
      return;
    }
    const key = form.api_key.trim();
    if (cfg.requiresKey && !key) {
      toast.error("Informe a API Key antes de buscar modelos.");
      return;
    }
    setFetchingModels(true);
    try {
      const ids = await cfg.fetchModels(key, form.base_url.trim());
      setFetchedModels(ids);
      if (ids.length > 0 && !ids.includes(form.model)) {
        setForm((f) => ({ ...f, model: ids[0] }));
      }
      toast.success(`${ids.length} modelo(s) carregado(s).`);
    } catch (err: unknown) {
      toast.error(`Erro ao buscar modelos: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setFetchingModels(false);
    }
  };

  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const { data: tenants } = useTenants();
  const effectiveTenant = isSuper ? selectedTenant || undefined : activeTenantSlug || undefined;

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["llm-configs", effectiveTenant],
    queryFn: () => listLLMConfigs(effectiveTenant),
    retry: 1,
  });

  const upsertMut = useMutation({
    mutationFn: (input: UpsertLLMConfigInput) => upsertLLMConfig(input, effectiveTenant),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm-configs"] });
      toast.success("Configuração salva.");
      setShowForm(false);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (provider: string) => deleteLLMConfig(provider, effectiveTenant),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm-configs"] });
      toast.success("Configuração removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDelete = useCallback(
    async (provider: string) => {
      const ok = await confirm({
        title: "Remover configuração",
        message: `Remover configuração do provider "${provider}"? O executor voltará a usar a variável de ambiente.`,
        confirmLabel: "Remover",
      });
      if (!ok) return;
      setBusyId(provider);
      deleteMut.mutate(provider, { onSettled: () => setBusyId(null) });
    },
    [confirm, deleteMut],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.model.trim()) {
      toast.error("Model é obrigatório.");
      return;
    }
    upsertMut.mutate({
      provider: form.provider,
      model: form.model.trim(),
      api_key: form.api_key.trim() || undefined,
      base_url: form.base_url.trim() || undefined,
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
              <option key={t.id} value={t.slug}>{t.name} ({t.slug})</option>
            ))}
          </select>
        )}
        {activeTab === "providers" && (
          <button className="btn primary" onClick={() => setShowForm(!showForm)}>
            <IconPlus size={14} />
            {showForm ? "Cancelar" : "Nova configuração"}
          </button>
        )}
      </div>

      <div className="page-body">
        <div className="section-head" style={{ marginTop: 0 }}>
          <div>
            <h1 className="page-h1">Configuração LLM</h1>
            <p className="page-lead" style={{ marginBottom: 0 }}>
              Chaves e modelos por tenant. Sobrepõem as variáveis de ambiente do executor.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border)", marginBottom: 24 }}>
          {(["providers", "analytics"] as const).map((tab) => (
            <button
              key={tab}
              className="btn"
              style={{
                borderRadius: "4px 4px 0 0",
                borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? "var(--accent)" : undefined,
                padding: "8px 16px",
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "providers" ? "Providers" : "Analytics"}
            </button>
          ))}
        </div>

        {activeTab === "analytics" && (
          <LLMAnalyticsTab tenantId={effectiveTenant} />
        )}

        {activeTab === "providers" && showForm && (
          <div className="card" style={{ marginBottom: 28, padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>
              Nova / Atualizar configuração
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
                  <span className="field-label">Provider</span>
                  <select
                    className="field-select"
                    value={form.provider}
                    onChange={(e) => {
                      const p = e.target.value;
                      setForm((f) => ({ ...f, provider: p, model: PROVIDER_REGISTRY[p]?.defaultModel || "" }));
                      setFetchedModels([]);
                    }}
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="field-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    Model
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: 12, padding: "2px 8px", height: "auto" }}
                      onClick={handleFetchModels}
                      disabled={fetchingModels}
                    >
                      {fetchingModels ? "Buscando…" : "Buscar modelos"}
                    </button>
                  </span>
                  {fetchedModels.length > 0 ? (
                    <select
                      className="field-select"
                      value={form.model}
                      onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                      required
                    >
                      {fetchedModels.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        className="field-input"
                        value={form.model}
                        onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                        placeholder="Ex: gpt-4o-mini"
                        list="model-options"
                        required
                      />
                      <datalist id="model-options">
                        {(PROVIDER_REGISTRY[form.provider]?.staticModels || []).map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </>
                  )}
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="field-label">API Key</span>
                  <input
                    className="field-input"
                    type="password"
                    value={form.api_key}
                    onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                    placeholder="sk-...  (vazio = manter existente)"
                    autoComplete="new-password"
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="field-label">Base URL <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></span>
                  <input
                    className="field-input"
                    value={form.base_url}
                    onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))}
                    placeholder="https://api.openai.com"
                  />
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

        {activeTab === "providers" && (
          isLoading ? (
            <p className="muted">Carregando...</p>
          ) : configs.length === 0 ? (
            <div className="empty-state">
              <div className="big">Nenhuma configuração cadastrada</div>
              O executor usa as variáveis de ambiente como fallback.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Model</th>
                    <th>Base URL</th>
                    <th>Chave</th>
                    <th>Atualizado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((cfg) => (
                    <ConfigRow
                      key={cfg.provider}
                      cfg={cfg}
                      onDelete={handleDelete}
                      busy={busyId === cfg.provider || deleteMut.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </>
  );
}
