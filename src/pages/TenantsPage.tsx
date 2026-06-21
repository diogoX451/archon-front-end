import { useMemo, useState } from "react";
import { IconPlus } from "@shared/ui/icons/Icons";
import {
  useCreateTenant, useTenants, useUpdateTenant,
  useUpdateTenantStatus, useUpdateTenantPlan,
} from "@shared/hooks/useTenants";
import type { Tenant, PlanTier } from "@shared/api/tenants";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useConfirm, useToast } from "@shared/ui/feedback";

const PLAN_COLORS: Record<PlanTier, { bg: string; color: string; label: string }> = {
  free:       { bg: "#f3f4f6", color: "#6b7280", label: "Free"       },
  starter:    { bg: "#dbeafe", color: "#1d4ed8", label: "Starter"    },
  growth:     { bg: "#ede9fe", color: "#7c3aed", label: "Growth"     },
  enterprise: { bg: "#fef9c3", color: "#92400e", label: "Enterprise" },
};

function PlanBadge({ plan }: { plan?: string }) {
  const tier = (plan || "free") as PlanTier;
  const { bg, color, label } = PLAN_COLORS[tier] ?? PLAN_COLORS.free;
  return (
    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", background: bg, color }}>
      {label}
    </span>
  );
}

const PLAN_DESC: Record<PlanTier, string> = {
  free:       "CRM contatos, cartões de visita, 50 execuções/mês, 1 agente",
  starter:    "CRM, cartões, 500 execuções, 5 agentes, 1GB RAG, 500k tokens",
  growth:     "Tudo do Starter + 2.000 exec, 20 agentes, 5GB RAG, 2M tokens, graph memory",
  enterprise: "Sem limites — tudo incluído",
};

export function TenantsPage() {
  const { data: tenants, isLoading, error } = useTenants();
  const createTenant      = useCreateTenant();
  const updateTenant      = useUpdateTenant();
  const updateTenantStatus = useUpdateTenantStatus();
  const updateTenantPlan  = useUpdateTenantPlan();
  const toast = useToast();
  const confirm = useConfirm();

  const [showCreate, setShowCreate] = useState(false);
  const [slug, setSlug]       = useState("");
  const [name, setName]       = useState("");
  const [document, setDocument] = useState("");

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editName, setEditName]           = useState("");
  const [editDocument, setEditDocument]   = useState("");

  const [planTenant, setPlanTenant] = useState<Tenant | null>(null);
  const [editPlan, setEditPlan]     = useState<PlanTier>("free");
  const [editExpires, setEditExpires] = useState("");

  const activeCount = useMemo(() => (tenants || []).filter((t) => t.active).length, [tenants]);

  const handleCreate = async () => {
    if (!slug.trim() || !name.trim()) return;
    try {
      await createTenant.mutateAsync({ slug: slug.trim(), name: name.trim(), document: document.trim() || undefined });
      setSlug(""); setName(""); setDocument(""); setShowCreate(false);
      toast.success("Empresa criada.");
    } catch (err: unknown) { toast.error(`Erro: ${(err as Error)?.message || String(err)}`); }
  };

  const openEdit = (t: Tenant) => { setEditingTenant(t); setEditName(t.name); setEditDocument(t.document || ""); };
  const handleEdit = async () => {
    if (!editingTenant || !editName.trim()) return;
    try {
      await updateTenant.mutateAsync({ id: editingTenant.id, input: { name: editName.trim(), document: editDocument.trim() || undefined } });
      setEditingTenant(null); toast.success("Empresa atualizada.");
    } catch (err: unknown) { toast.error(`Erro: ${(err as Error)?.message || String(err)}`); }
  };

  const handleToggleStatus = async (t: Tenant) => {
    if (t.active) {
      const ok = await confirm({
        title: "Inativar empresa",
        message: `Inativar ${t.name}? Usuários e automações desta empresa poderão perder acesso até que ela seja reativada.`,
        confirmLabel: "Inativar",
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      await updateTenantStatus.mutateAsync({ id: t.id, input: { active: !t.active } });
      toast.success(!t.active ? "Ativada." : "Inativada.");
    } catch (err: unknown) { toast.error(`Erro: ${(err as Error)?.message || String(err)}`); }
  };

  const openPlan = (t: Tenant) => {
    setPlanTenant(t);
    setEditPlan((t.plan || "free") as PlanTier);
    setEditExpires(t.plan_expires_at ? t.plan_expires_at.slice(0, 10) : "");
  };
  const handleSavePlan = async () => {
    if (!planTenant) return;
    try {
      const expiresAt = editExpires ? new Date(editExpires + "T23:59:59Z").toISOString() : null;
      await updateTenantPlan.mutateAsync({ id: planTenant.id, input: { plan: editPlan, plan_expires_at: expiresAt } });
      setPlanTenant(null); toast.success("Plano atualizado.");
    } catch (err: unknown) { toast.error(`Erro: ${(err as Error)?.message || String(err)}`); }
  };

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }} />
        <button type="button" className="btn primary" onClick={() => setShowCreate(true)}>
          <IconPlus size={14} /> Nova empresa
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Empresas</h1>
        <div className="stat-grid">
          <div className="stat"><div className="label">Ativas</div><div className="value">{isLoading ? "…" : activeCount}</div></div>
          <div className="stat"><div className="label">Total</div><div className="value">{isLoading ? "…" : tenants?.length || 0}</div></div>
        </div>
        {error && <div className="card" style={{ borderColor: "var(--err)", color: "var(--err)", marginBottom: 20 }}>Erro: {error.message}</div>}
        <table className="table">
          <thead>
            <tr><th>Nome</th><th>Slug</th><th>Documento</th><th>Plano</th><th>Status</th><th>Criado</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {(tenants || []).map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 500 }}>{t.name}</td>
                <td className="mono">{t.slug}</td>
                <td className="muted mono">{t.document || "—"}</td>
                <td><PlanBadge plan={t.plan} /></td>
                <td><span className="pill" data-tone={t.active ? "ok" : "warn"}><span className="dot" />{t.active ? "ativo" : "inativo"}</span></td>
                <td className="muted">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                <td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button type="button" className="btn" onClick={() => openEdit(t)}>Editar</button>
                    <button type="button" className="btn" style={{ borderColor: "oklch(0.55 0.13 248)", color: "oklch(0.55 0.13 248)" }} onClick={() => openPlan(t)}>Plano</button>
                    <button type="button" className="btn" onClick={() => void handleToggleStatus(t)} disabled={updateTenantStatus.isPending}>{t.active ? "Inativar" : "Ativar"}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div style={overlayStyle} onClick={() => setShowCreate(false)}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Nova empresa</div>
            <div style={{ display: "grid", gap: 10 }}>
              <input className="search-input" placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
              <input className="search-input" placeholder="nome" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="search-input" placeholder="documento (opcional)" value={document} onChange={(e) => setDocument(e.target.value)} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" className="btn" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button type="button" className="btn primary" onClick={handleCreate} disabled={createTenant.isPending}>{createTenant.isPending ? "Criando..." : "Criar"}</button>
            </div>
          </div>
        </div>
      )}

      {editingTenant && (
        <div style={overlayStyle} onClick={() => setEditingTenant(null)}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Editar empresa</div>
            <div style={{ display: "grid", gap: 10 }}>
              <input className="search-input" value={editingTenant.slug} disabled />
              <input className="search-input" placeholder="nome" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <input className="search-input" placeholder="documento (opcional)" value={editDocument} onChange={(e) => setEditDocument(e.target.value)} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" className="btn" onClick={() => setEditingTenant(null)}>Cancelar</button>
              <button type="button" className="btn primary" onClick={handleEdit} disabled={updateTenant.isPending}>{updateTenant.isPending ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {planTenant && (
        <div style={overlayStyle} onClick={() => setPlanTenant(null)}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Gerenciar plano</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14 }}>{planTenant.name} · {planTenant.slug}</div>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--ink-3)", display: "block", marginBottom: 4 }}>Plano</label>
                <select className="search-input" value={editPlan} onChange={(e) => setEditPlan(e.target.value as PlanTier)} style={{ width: "100%" }}>
                  {(["free", "starter", "growth", "enterprise"] as PlanTier[]).map((p) => (
                    <option key={p} value={p}>{PLAN_COLORS[p].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--ink-3)", display: "block", marginBottom: 4 }}>Expira em <span style={{ color: "var(--ink-4)" }}>(opcional)</span></label>
                <input type="date" className="search-input" value={editExpires} onChange={(e) => setEditExpires(e.target.value)} style={{ width: "100%" }} />
              </div>
              <div style={{ padding: "10px 12px", borderRadius: "var(--r-2)", background: PLAN_COLORS[editPlan].bg, color: PLAN_COLORS[editPlan].color, fontSize: 12, fontWeight: 500 }}>
                ✓ {PLAN_DESC[editPlan]}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" className="btn" onClick={() => setPlanTenant(null)}>Cancelar</button>
              <button type="button" className="btn primary" onClick={handleSavePlan} disabled={updateTenantPlan.isPending}>{updateTenantPlan.isPending ? "Salvando..." : "Salvar plano"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgb(10 12 16 / 0.55)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 };
const modalStyle: React.CSSProperties = { width: "100%", maxWidth: 520, padding: 18 };
