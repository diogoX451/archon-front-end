import { useCallback, useState } from "react";
import { useAuth } from "@app/auth-context";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useToast, useConfirm } from "@shared/ui/feedback";
import { listLLMConfigs, upsertLLMConfig, deleteLLMConfig } from "@shared/api/llmConfig";
import type { LLMConfig, UpsertLLMConfigInput } from "@shared/api/llmConfig";
import { IconPlus } from "@shared/ui/icons/Icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenants } from "@shared/hooks/useTenants";

const PROVIDERS = ["openai", "gemini", "ollama"];

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash-lite",
  ollama: "qwen2.5:7b",
};

const MODEL_OPTIONS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini", "o3-mini"],
  gemini: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
  ollama: ["qwen2.5:7b", "llama3:8b", "mistral:7b", "phi3:mini", "gemma3:4b"],
};

const PROVIDER_TONE: Record<string, string> = {
  openai: "",
  gemini: "ok",
  ollama: "warn",
};

interface FormState {
  provider: string;
  model: string;
  api_key: string;
  base_url: string;
}

const emptyForm = (): FormState => ({
  provider: "openai",
  model: DEFAULT_MODELS["openai"],
  api_key: "",
  base_url: "",
});

function ProviderPill({ provider }: { provider: string }) {
  return (
    <span className="pill" data-tone={PROVIDER_TONE[provider] ?? ""}>
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

export function LLMConfigPage() {
  const { isSuper, activeTenantSlug } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  const handleFetchModels = async () => {
    const key = form.api_key.trim();
    if (form.provider !== "ollama" && !key) {
      toast.error("Informe a API Key antes de buscar modelos.");
      return;
    }
    setFetchingModels(true);
    try {
      let ids: string[] = [];
      if (form.provider === "openai") {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) throw new Error(`OpenAI ${res.status}`);
        const data = await res.json();
        ids = (data.data as { id: string }[])
          .map((m) => m.id)
          .filter((id) => /^(gpt-|o1|o3|chatgpt)/.test(id))
          .sort();
      } else if (form.provider === "gemini") {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
        );
        if (!res.ok) throw new Error(`Gemini ${res.status}`);
        const data = await res.json();
        ids = ((data.models || []) as { name: string; supportedGenerationMethods?: string[] }[])
          .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m) => m.name.replace("models/", ""))
          .sort();
      } else if (form.provider === "ollama") {
        const base = (form.base_url.trim() || "http://localhost:11434").replace(/\/$/, "");
        const res = await fetch(`${base}/api/tags`);
        if (!res.ok) throw new Error(`Ollama ${res.status}`);
        const data = await res.json();
        ids = ((data.models || []) as { name: string }[]).map((m) => m.name).sort();
      }
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
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>
          <IconPlus size={14} />
          {showForm ? "Cancelar" : "Nova configuração"}
        </button>
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

        {showForm && (
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
                      setForm((f) => ({ ...f, provider: p, model: DEFAULT_MODELS[p] || "" }));
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
                        {(MODEL_OPTIONS[form.provider] || []).map((m) => (
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

        {isLoading ? (
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
        )}
      </div>
    </>
  );
}
