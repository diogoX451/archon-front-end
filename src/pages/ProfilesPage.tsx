import { useMemo, useState } from "react";
import { IconPlus } from "@shared/ui/icons/Icons";
import { useCreateUser, useUsers } from "@shared/hooks/useUsers";

export function ProfilesPage() {
  const { data: users, isLoading, error } = useUsers();
  const createUser = useCreateUser();

  const [showCreate, setShowCreate] = useState(false);
  const [tenantSlug, setTenantSlug] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);

  const activeCount = useMemo(() => (users || []).filter((u) => u.is_active).length, [users]);

  const handleCreate = async () => {
    if (!tenantSlug.trim() || !name.trim() || !email.trim() || !password.trim()) return;
    try {
      await createUser.mutateAsync({
        tenant_slug: tenantSlug.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
        is_tenant_admin: isTenantAdmin,
      });
      setName("");
      setEmail("");
      setPassword("");
      setIsTenantAdmin(false);
      setShowCreate(false);
    } catch (err: any) {
      window.alert(`Erro ao criar usuário: ${err?.message || err}`);
    }
  };

  return (
    <>
      <div className="page-topbar">
        <span className="page-title">Usuários</span>
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">Membros da equipe</span>
        <div style={{ flex: 1 }}></div>
        <button className="btn primary" onClick={() => setShowCreate(true)}>
          <IconPlus size={14} /> Novo usuário
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Usuários</h1>
        <p className="page-lead">Lista e cadastro via <code>/api/v1/users</code>.</p>

        <div className="stat-grid">
          <div className="stat"><div className="label">Total</div><div className="value">{isLoading ? "…" : users?.length || 0}</div></div>
          <div className="stat"><div className="label">Ativos</div><div className="value">{isLoading ? "…" : activeCount}</div></div>
        </div>

        {error && (
          <div className="card" style={{ borderColor: "var(--err)", color: "var(--err)", marginBottom: 20 }}>
            Erro ao carregar usuários: {error.message}
          </div>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Tenant</th>
              <th>Perfil</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td className="mono">{u.email}</td>
                <td className="muted mono">{u.tenant_slug}</td>
                <td>{u.is_super ? "super-admin" : u.is_tenant_admin ? "tenant-admin" : "user"}</td>
                <td>
                  <span className="pill" data-tone={u.is_active ? "ok" : "warn"}>
                    <span className="dot"></span>{u.is_active ? "ativo" : "inativo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div style={overlayStyle} onClick={() => setShowCreate(false)}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Cadastrar usuário</div>
            <div style={{ display: "grid", gap: 10 }}>
              <input className="search-input" placeholder="tenant_slug" value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} />
              <input className="search-input" placeholder="nome" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="search-input" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="search-input" placeholder="senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={isTenantAdmin} onChange={(e) => setIsTenantAdmin(e.target.checked)} />
                Tenant admin
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="btn primary" onClick={handleCreate} disabled={createUser.isPending}>
                {createUser.isPending ? "Criando..." : "Criar"}
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
