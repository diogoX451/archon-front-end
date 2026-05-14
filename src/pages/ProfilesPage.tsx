import { useMemo, useState } from "react";
import { IconPlus } from "@shared/ui/icons/Icons";
import {
  useAssociateRoleWithUser,
  useCreateUser,
  useDissociateRoleWithUser,
  useUpdateUser,
  useUpdateUserStatus,
  useUserRoles,
  useUsers,
} from "@shared/hooks/useUsers";
import { useRoles } from "@shared/hooks/useRoles";
import type { User } from "@shared/api/users";
import type { Role } from "@shared/api/roles";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useToast } from "@shared/ui/feedback";
import { useAuth } from "@app/auth-context";

export function ProfilesPage() {
  const { isSuper, activeTenantSlug } = useAuth();
  const { data: users, isLoading, error } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const updateUserStatus = useUpdateUserStatus();
  const toast = useToast();

  const [showCreate, setShowCreate] = useState(false);
  // Tenant-admins create users inside their own tenant; the field is
  // hidden in the modal and pinned to their JWT slug. Super-admins may
  // override and aim at any tenant.
  const [tenantSlug, setTenantSlug] = useState(isSuper ? "" : activeTenantSlug || "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editIsTenantAdmin, setEditIsTenantAdmin] = useState(false);
  const [rolesUser, setRolesUser] = useState<User | null>(null);

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
      toast.success("Usuário criado.");
    } catch (err: any) {
      toast.error(`Erro ao criar usuário: ${err?.message || err}`);
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditIsTenantAdmin(user.is_tenant_admin);
  };

  const handleEdit = async () => {
    if (!editingUser || !editName.trim() || !editEmail.trim()) return;
    try {
      await updateUser.mutateAsync({
        id: editingUser.id,
        input: {
          name: editName.trim(),
          email: editEmail.trim(),
          is_tenant_admin: editIsTenantAdmin,
        },
      });
      setEditingUser(null);
      setEditName("");
      setEditEmail("");
      setEditIsTenantAdmin(false);
      toast.success("Usuário atualizado.");
    } catch (err: any) {
      toast.error(`Erro ao editar usuário: ${err?.message || err}`);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const nextActive = !user.is_active;
    try {
      await updateUserStatus.mutateAsync({
        id: user.id,
        input: { is_active: nextActive },
      });
      toast.success(nextActive ? "Usuário ativado." : "Usuário inativado.");
    } catch (err: any) {
      toast.error(`Erro ao ${nextActive ? "ativar" : "inativar"} usuário: ${err?.message || err}`);
    }
  };

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }}></div>
        <button className="btn primary" onClick={() => setShowCreate(true)}>
          <IconPlus size={14} /> Novo usuário
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Usuários</h1>
        
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
              <th>Ações</th>
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
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" onClick={() => openEdit(u)}>
                      Editar
                    </button>
                    <button className="btn" onClick={() => setRolesUser(u)} disabled={u.is_super}>
                      Papéis
                    </button>
                    <button className="btn" onClick={() => void handleToggleStatus(u)} disabled={updateUserStatus.isPending}>
                      {u.is_active ? "Inativar" : "Ativar"}
                    </button>
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
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Cadastrar usuário</div>
            <div style={{ display: "grid", gap: 10 }}>
              {isSuper && (
                <input className="search-input" placeholder="tenant_slug" value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} />
              )}
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

      {rolesUser && (
        <UserRolesModal user={rolesUser} onClose={() => setRolesUser(null)} />
      )}

      {editingUser && (
        <div style={overlayStyle} onClick={() => setEditingUser(null)}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Editar usuário</div>
            <div style={{ display: "grid", gap: 10 }}>
              <input className="search-input" value={editingUser.tenant_slug} disabled />
              <input className="search-input" placeholder="nome" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <input className="search-input" placeholder="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={editIsTenantAdmin} onChange={(e) => setEditIsTenantAdmin(e.target.checked)} />
                Tenant admin
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => setEditingUser(null)}>Cancelar</button>
              <button className="btn primary" onClick={handleEdit} disabled={updateUser.isPending}>
                {updateUser.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Modal that lets an admin attach or detach roles from a single user.
// Roles are scoped to the user's tenant (the /roles endpoint filters
// by tenant slug); inherited permissions still resolve transitively
// at login time via the parent_role_id chain on the backend.
function UserRolesModal({ user, onClose }: { user: User; onClose: () => void }) {
  const tenantSlug = user.tenant_slug || undefined;
  const rolesQuery = useRoles(tenantSlug);
  const userRolesQuery = useUserRoles(user.id);
  const associate = useAssociateRoleWithUser();
  const dissociate = useDissociateRoleWithUser();
  const toast = useToast();

  const tenantRoles = useMemo(
    () => (rolesQuery.data || []).filter((r: Role) => !r.is_template),
    [rolesQuery.data],
  );
  const assigned = useMemo(() => {
    const s = new Set<string>();
    for (const r of userRolesQuery.data || []) s.add(r.id);
    return s;
  }, [userRolesQuery.data]);

  const toggle = async (role: Role) => {
    try {
      if (assigned.has(role.id)) {
        await dissociate.mutateAsync({ userId: user.id, roleId: role.id });
      } else {
        await associate.mutateAsync({ userId: user.id, roleId: role.id });
      }
    } catch (err: any) {
      toast.error(`Erro ao atualizar papel: ${err?.message || err}`);
    }
  };

  const busy = associate.isPending || dissociate.isPending;
  const loading = rolesQuery.isLoading || userRolesQuery.isLoading;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Papéis de {user.name}</div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
          {user.email} · tenant <span className="mono">{user.tenant_slug}</span>
        </div>

        {loading ? (
          <div className="muted">Carregando…</div>
        ) : tenantRoles.length === 0 ? (
          <div className="muted">Nenhum papel disponível neste tenant.</div>
        ) : (
          <div style={{ display: "grid", gap: 6, maxHeight: 380, overflowY: "auto" }}>
            {tenantRoles.map((role) => {
              const checked = assigned.has(role.id);
              return (
                <label
                  key={role.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "8px 10px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    cursor: busy ? "wait" : "pointer",
                    background: checked ? "rgb(34 197 94 / 0.06)" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => void toggle(role)}
                    disabled={busy}
                    style={{ marginTop: 2 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{role.name}</span>
                      {role.is_managed && (
                        <span className="pill" data-tone="ok" style={{ fontSize: 10 }}>
                          <span className="dot"></span>gerenciado
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        {role.description}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button className="btn" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
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
