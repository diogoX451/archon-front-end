import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GLYPHS } from "@shared/ui/icons/glyphs";
import { IconPlus, IconTrash, GlyphPlanner } from "@shared/ui/icons/Icons";
import { AGENT_TYPES } from "@features/workflow-builder/data";
import { useProfiles, useDeleteProfile } from "@shared/hooks/useProfiles";
import { useTenants } from "@shared/hooks/useTenants";
import type { ConversationProfileV2 } from "@shared/api/profiles";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useConfirm, useToast } from "@shared/ui/feedback";
import { useAuth } from "@app/auth-context";
import { canAny } from "@shared/authz";

function agentsArray(profile: ConversationProfileV2): Array<{ id: string; type: string }> {
  const raw = profile.agents as any;
  if (!Array.isArray(raw)) return [];
  return raw.filter((a) => a && typeof a === "object" && typeof a.id === "string" && typeof a.type === "string");
}

export function TemplatesPage() {
  const { activeTenantSlug, isSuper, hasPermission } = useAuth();
  const canList = canAny({ isSuper, hasPermission }, ["conversation_profile_list"]);
  const canWrite = canAny({ isSuper, hasPermission }, ["workflow_update", "workflow_create"]);
  const [tab, setTab] = useState("profiles");
  const [search, setSearch] = useState("");
  const { data: profiles, isLoading, error } = useProfiles();
  const { data: tenants } = useTenants();
  const deleteMutation = useDeleteProfile();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const tenantLabel = (tenantId?: string) => {
    if (!tenantId) return activeTenantSlug || "global";
    const t = tenants?.find((x) => x.id === tenantId);
    return t ? `${t.name} (${t.slug})` : (activeTenantSlug || tenantId);
  };

  const profileName = (p: ConversationProfileV2) => {
    const meta = (p.metadata || {}) as any;
    const uiName = typeof meta?.ui?.name === "string" ? meta.ui.name.trim() : "";
    return uiName || p.profile_id || p.id;
  };

  const filtered = (profiles || []).filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = profileName(p).toLowerCase();
    const id = (p.profile_id || p.id || "").toLowerCase();
    const desc = (p.description || "").toLowerCase();
    return name.includes(q) || id.includes(q) || desc.includes(q);
  });

  const onDelete = async (id: string) => {
    const ok = await confirm({
      title: "Excluir agente",
      message: `Tem certeza que quer excluir o profile "${id}"? Esta ação é irreversível.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Agente excluído.");
    } catch (err: any) {
      toast.error(`Erro ao excluir: ${err?.message || err}`);
    }
  };

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }}></div>
        <Link to="/workflows/builder/new" className="btn primary" style={{ pointerEvents: canWrite ? "auto" : "none", opacity: canWrite ? 1 : 0.5 }}>
          <IconPlus size={14} />
          Novo agente
        </Link>
      </div>

      <div className="page-body">
        {!canList && (
          <div className="card" style={{ borderColor: "var(--err)", color: "var(--err)", marginBottom: 16 }}>
            Você não tem permissão para listar agentes.
          </div>
        )}
        <h1 className="page-h1">Agentes</h1>

        <div className="stat-grid">
          <div className="stat">
            <div className="label">Profiles totais</div>
            <div className="value">{isLoading ? "…" : profiles?.length ?? 0}</div>
            <div className="delta">via API</div>
          </div>
          <div className="stat">
            <div className="label">Tipos de agente</div>
            <div className="value">{Object.keys(AGENT_TYPES).length}</div>
            <div className="delta">built-in</div>
          </div>
        </div>

        <div className="page-tabs">
          <button type="button" className="page-tab" data-active={tab === "profiles"} onClick={() => setTab("profiles")}>
            Profiles
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", marginLeft: 4 }}>
              {profiles?.length ?? 0}
            </span>
          </button>
          <button type="button" className="page-tab" data-active={tab === "types"} onClick={() => setTab("types")}>
            Tipos de agente
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", marginLeft: 4 }}>
              {Object.keys(AGENT_TYPES).length}
            </span>
          </button>
        </div>

        {tab === "profiles" && (
          <>
            <div className="toolbar">
              <input
                className="search-input"
                placeholder="Buscar profile por id ou descrição…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar profile por id ou descrição"
              />
              <div className="grow"></div>
              <span style={{ color: "var(--ink-3)", fontSize: 12 }}>
                {isLoading ? "carregando…" : `${filtered.length} profile${filtered.length === 1 ? "" : "s"}`}
              </span>
            </div>

            {error && (
              <div className="card" style={{ padding: 16, borderColor: "var(--err)", marginBottom: 16 }}>
                <span style={{ color: "var(--err)", fontSize: 13 }}>
                  Erro ao carregar profiles: {error.message}
                </span>
              </div>
            )}

            {!isLoading && filtered.length === 0 && !error && (
              <div style={{ textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>🧠</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {search ? "Nenhum profile encontrado" : "Nenhum profile criado"}
                </div>
                <div style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 16 }}>
                  Crie o primeiro agente clicando em "Novo agente" acima.
                </div>
                {!search && (
                  <Link to="/workflows/builder/new" className="btn primary">
                    <IconPlus size={14} /> Criar agente
                  </Link>
                )}
              </div>
            )}

            {filtered.length > 0 && (
              <table className="table">
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Tenant</th>
                    <th className="num">Agentes</th>
                    <th>Atualizado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const slug = p.profile_id || p.id;
                    const name = profileName(p);
                    const agents = agentsArray(p);
                    // Route key is the backend UUID — the slug stays as
                    // a display label so URLs don't leak template names
                    // or tenant slugs to anyone browser-history-stalking.
                    const target = `/workflows/builder/${encodeURIComponent(p.id)}`;
                    return (
                      <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => navigate(target)}>
                        <td>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                            {name}
                          </div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                            {slug}
                          </div>
                          {p.description && (
                            <div style={{
                              fontSize: 11.5, color: "var(--ink-3)", marginTop: 2,
                              maxWidth: 380, overflow: "hidden",
                              textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{p.description}</div>
                          )}
                        </td>
                        <td>
                          <span className="pill" data-tone="muted">{tenantLabel(p.tenant_id)}</span>
                        </td>
                        <td className="num mono">{agents.length}</td>
                        <td className="muted" style={{ fontSize: 12 }}>
                          {p.updated_at ? new Date(p.updated_at).toLocaleString("pt-BR") : "—"}
                        </td>
                        <td style={{ width: 160, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                          <Link to={target} className="btn ghost" style={{ marginRight: 6 }}>
                            Abrir
                          </Link>
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => onDelete(slug)}
                            disabled={deleteMutation.isPending || !canWrite}
                            title="Excluir profile"
                          >
                            <IconTrash size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {tab === "types" && (
          <>
            <p className="page-lead" style={{ fontSize: 13, marginBottom: 16 }}>
              Tipos disponíveis para arrastar na paleta do builder. Cada agente declara portas
              <strong style={{ color: "var(--ink)" }}> principais</strong> (entrada) e
              <strong style={{ color: "var(--ink)" }}> auxiliares</strong> (saídas).
            </p>

            <div className="card-grid">
              {Object.entries(AGENT_TYPES).map(([type, metaInfo]) => {
                const Glyph = (GLYPHS as any)[metaInfo.glyph] || GlyphPlanner;
                return (
                  <div key={type} className="card">
                    <div className="card-header">
                      <div className="card-glyph"><Glyph size={16} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="card-title">{metaInfo.label}</div>
                        <div className="card-sub">{type}</div>
                      </div>
                      <span className="pill"><span className="dot"></span>{metaInfo.category}</span>
                    </div>
                    <div className="card-desc">{metaInfo.description}</div>
                    <div className="card-foot">
                      <div className="card-ports" title="portas">
                        {metaInfo.ports.principal.map((p: string) => (
                          <span key={`p-${p}`} className="card-port-dot" data-kind="principal" />
                        ))}
                        {metaInfo.ports.auxiliary.map((p: string) => (
                          <span key={`a-${p}`} className="card-port-dot" />
                        ))}
                      </div>
                      <span className="muted">{metaInfo.needType ? `need: ${metaInfo.needType}` : "local"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

    </>
  );
}
