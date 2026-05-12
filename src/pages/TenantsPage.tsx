import { useMemo, useState } from "react";
import { IconPlus } from "@shared/ui/icons/Icons";
import { useCreateTenant, useTenants } from "@shared/hooks/useTenants";

export function TenantsPage() {
  const { data: tenants, isLoading, error } = useTenants();
  const createTenant = useCreateTenant();

  const [showCreate, setShowCreate] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");

  const activeCount = useMemo(() => (tenants || []).filter((t) => t.active).length, [tenants]);

  const handleCreate = async () => {
    if (!slug.trim() || !name.trim()) return;
    try {
      await createTenant.mutateAsync({
        slug: slug.trim(),
        name: name.trim(),
        document: document.trim() || undefined,
      });
      setSlug("");
      setName("");
      setDocument("");
      setShowCreate(false);
    } catch (err: any) {
      window.alert(`Erro ao criar tenant: ${err?.message || err}`);
    }
  };

  return (
    <>
      <div className="page-topbar">
        <span className="page-title">Tenants</span>
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">Organizações e isolamento</span>
        <div style={{ flex: 1 }}></div>
        <button className="btn primary" onClick={() => setShowCreate(true)}>
          <IconPlus size={14} /> Novo tenant
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Tenants</h1>
        <p className="page-lead">Gerenciamento via <code>/api/v1/tenants</code>.</p>

        <div className="stat-grid">
          <div className="stat"><div className="label">Tenants ativos</div><div className="value">{isLoading ? "…" : activeCount}</div></div>
          <div className="stat"><div className="label">Total</div><div className="value">{isLoading ? "…" : tenants?.length || 0}</div></div>
        </div>

        {error && (
          <div className="card" style={{ borderColor: "var(--err)", color: "var(--err)", marginBottom: 20 }}>
            Erro ao carregar tenants: {error.message}
          </div>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Slug</th>
              <th>Documento</th>
              <th>Status</th>
              <th>Criado</th>
            </tr>
          </thead>
          <tbody>
            {(tenants || []).map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 500 }}>{t.name}</td>
                <td className="mono">{t.slug}</td>
                <td className="muted mono">{t.document || "—"}</td>
                <td>
                  <span className="pill" data-tone={t.active ? "ok" : "warn"}>
                    <span className="dot"></span>{t.active ? "ativo" : "inativo"}
                  </span>
                </td>
                <td className="muted">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div style={overlayStyle} onClick={() => setShowCreate(false)}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Cadastrar tenant</div>
            <div style={{ display: "grid", gap: 10 }}>
              <input className="search-input" placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
              <input className="search-input" placeholder="nome" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="search-input" placeholder="documento (opcional)" value={document} onChange={(e) => setDocument(e.target.value)} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="btn primary" onClick={handleCreate} disabled={createTenant.isPending}>
                {createTenant.isPending ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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
