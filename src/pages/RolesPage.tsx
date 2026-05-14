import { useMemo, useState } from "react";
import { useAuth } from "@app/auth-context";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { IconPlus } from "@shared/ui/icons/Icons";
import {
  useAssociateRolePermission,
  useCreateRole,
  useDeleteRole,
  useDissociateRolePermission,
  useRoleAllowedPermissions,
  useRoleEffectivePermissions,
  useRoles,
  useUpdateRole,
} from "@shared/hooks/useRoles";
import { usePermissionsCatalogue } from "@shared/hooks/usePermissions";
import { useRoleTemplates } from "@shared/hooks/useRoleTemplates";
import { useConfirm, useToast } from "@shared/ui/feedback";
import type { Role } from "@shared/api/roles";

// Tenant-facing role editor:
//   - Managed roles (auto-cloned from a template) are shown with the
//     identity fields locked; only added permissions can be toggled.
//   - Custom roles let the tenant pick a parent template and freely
//     extend permissions within the ceiling.
//   - The permission picker is filtered by /allowed-permissions so
//     tenants only see what their template ancestor authorises.

export function RolesPage() {
  const { isSuper, activeTenantSlug } = useAuth();
  // Super-admins viewing this page act on the active tenant slug;
  // tenant-admins see only their own automatically (the backend filters).
  const tenantSlug = activeTenantSlug || undefined;

  const rolesQuery = useRoles(tenantSlug);
  const templatesQuery = useRoleTemplates();
  const catalogueQuery = usePermissionsCatalogue();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newParent, setNewParent] = useState("");
  const [editing, setEditing] = useState<Role | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const associate = useAssociateRolePermission();
  const dissociate = useDissociateRolePermission();
  const toast = useToast();
  const confirm = useConfirm();

  // Filter out templates from the tenant view — those live in /permissions.
  const tenantRoles = useMemo(
    () => (rolesQuery.data || []).filter((r) => !r.is_template),
    [rolesQuery.data],
  );
  const effectiveId = selectedId || tenantRoles[0]?.id || null;
  const selectedRole = useMemo(
    () => tenantRoles.find((r) => r.id === effectiveId) || null,
    [tenantRoles, effectiveId],
  );

  const effectiveQuery = useRoleEffectivePermissions(effectiveId);
  const allowedQuery = useRoleAllowedPermissions(effectiveId);
  const catalogue = catalogueQuery.data || [];

  const byKey = useMemo(() => {
    const m = new Map<string, { source: "own" | "inherited" }>();
    for (const p of effectiveQuery.data || []) m.set(p.key, { source: p.source });
    return m;
  }, [effectiveQuery.data]);

  const allowed = useMemo(() => {
    const s = new Set<string>();
    for (const k of allowedQuery.data || []) s.add(k);
    return s;
  }, [allowedQuery.data]);

  const handleCreate = async () => {
    if (!newName.trim() || !newParent) return;
    try {
      const role = await createRole.mutateAsync({
        tenant_slug: tenantSlug,
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        parent_role_id: newParent,
        resource_type: "tenant",
      });
      setSelectedId(role.id);
      setNewName("");
      setNewDescription("");
      setNewParent("");
      setShowCreate(false);
      toast.success("Papel criado.");
    } catch (err: any) {
      toast.error(`Erro ao criar papel: ${err?.message || err}`);
    }
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setEditName(role.name);
    setEditDescription(role.description || "");
  };

  const handleEdit = async () => {
    if (!editing || !editName.trim()) return;
    try {
      await updateRole.mutateAsync({
        id: editing.id,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        parent_role_id: editing.parent_role_id,
        resource_type: editing.resource_type,
        resource_id: editing.resource_id,
      });
      setEditing(null);
      toast.success("Papel atualizado.");
    } catch (err: any) {
      toast.error(`Erro ao salvar papel: ${err?.message || err}`);
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.is_managed) {
      toast.warning("Papéis gerenciados não podem ser excluídos — peça ao super-admin para remover o template correspondente.");
      return;
    }
    const ok = await confirm({
      title: "Excluir papel",
      message: `Tem certeza que quer excluir o papel "${role.name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteRole.mutateAsync(role.id);
      if (selectedId === role.id) setSelectedId(null);
      toast.success("Papel excluído.");
    } catch (err: any) {
      toast.error(`Erro ao excluir: ${err?.message || err}`);
    }
  };

  const togglePermission = async (key: string) => {
    if (!selectedRole) return;
    const entry = byKey.get(key);
    if (entry?.source === "inherited") return; // locked
    try {
      if (entry?.source === "own") {
        await dissociate.mutateAsync({ roleId: selectedRole.id, key });
      } else {
        await associate.mutateAsync({ roleId: selectedRole.id, key });
      }
    } catch (err: any) {
      toast.error(`Erro ao atualizar permissão: ${err?.message || err}`);
    }
  };

  // Templates available as parent_role_id. For tenants, the picker is
  // the list of global templates returned by /role-templates; the
  // backend will refuse if the parent doesn't trace to a template.
  const templateOptions = templatesQuery.data || [];

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }}></div>
        <button className="btn primary" onClick={() => setShowCreate(true)} disabled={templateOptions.length === 0}>
          <IconPlus size={14} /> Novo papel
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Papéis e permissões</h1>
        <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
          {isSuper
            ? "Visão de papéis do tenant ativo. Use /permissions para gerenciar os templates raiz."
            : "Você pode criar papéis personalizados a partir dos templates disponíveis. As permissões herdadas ficam travadas."}
        </p>

        {rolesQuery.error && (
          <div className="card" style={{ borderColor: "var(--err)", color: "var(--err)", marginBottom: 16 }}>
            Erro ao carregar papéis: {(rolesQuery.error as Error).message}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>
              Papéis do tenant ({rolesQuery.isLoading ? "…" : tenantRoles.length})
            </div>
            <div>
              {tenantRoles.map((role) => {
                const active = effectiveId === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedId(role.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 16px",
                      background: active ? "var(--surface-2)" : "transparent",
                      border: "none",
                      borderLeft: active ? "3px solid var(--ink)" : "3px solid transparent",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      color: "inherit",
                      font: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="mono" style={{ fontWeight: 500, fontSize: 13 }}>{role.name}</span>
                      {role.is_managed && (
                        <span className="pill" data-tone="ok" style={{ fontSize: 10 }}>
                          <span className="dot"></span>gerenciado
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.35 }}>
                        {role.description}
                      </div>
                    )}
                  </button>
                );
              })}
              {tenantRoles.length === 0 && !rolesQuery.isLoading && (
                <div className="muted" style={{ padding: 16 }}>
                  Nenhum papel ainda. Os templates serão clonados automaticamente.
                </div>
              )}
            </div>
          </div>

          {selectedRole ? (
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 18, display: "flex", alignItems: "center", gap: 10 }}>
                    {selectedRole.name}
                    {selectedRole.is_managed && (
                      <span className="pill" data-tone="ok" style={{ fontSize: 10 }}>
                        <span className="dot"></span>gerenciado
                      </span>
                    )}
                  </div>
                  {selectedRole.description && (
                    <div className="muted" style={{ marginTop: 4 }}>{selectedRole.description}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => openEdit(selectedRole)}>Editar</button>
                  <button
                    className="btn"
                    onClick={() => void handleDelete(selectedRole)}
                    disabled={selectedRole.is_managed || deleteRole.isPending}
                    title={selectedRole.is_managed ? "Papéis gerenciados são vinculados a um template" : undefined}
                  >
                    Excluir
                  </button>
                </div>
              </div>

              <div style={{ fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Permissões</div>
              <p className="muted" style={{ marginTop: -4, marginBottom: 12, fontSize: 12 }}>
                Permissões herdadas vêm do template e ficam travadas. As demais (dentro do teto autorizado) podem ser marcadas para estender este papel.
              </p>

              {effectiveQuery.isLoading || allowedQuery.isLoading || catalogueQuery.isLoading ? (
                <div className="muted">Carregando permissões…</div>
              ) : (
                <RolePermissionsEditor
                  catalogue={catalogue}
                  byKey={byKey}
                  allowed={allowed}
                  onToggle={togglePermission}
                  busy={associate.isPending || dissociate.isPending}
                />
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: 18 }}>
              <div className="muted">Selecione um papel para editar suas permissões.</div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div style={overlayStyle} onClick={() => setShowCreate(false)}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Novo papel personalizado</div>
            <div style={{ display: "grid", gap: 10 }}>
              <input className="search-input" placeholder="nome (ex.: vendas-junior)" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input className="search-input" placeholder="descrição (opcional)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
              <select
                className="search-input"
                value={newParent}
                onChange={(e) => setNewParent(e.target.value)}
              >
                <option value="">— template-pai (obrigatório) —</option>
                {templateOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <div className="muted" style={{ fontSize: 12 }}>
                O template-pai define o piso (permissões herdadas) e o teto (o que você poderá adicionar).
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="btn primary" onClick={handleCreate} disabled={createRole.isPending || !newParent}>
                {createRole.isPending ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div style={overlayStyle} onClick={() => setEditing(null)}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Editar papel</div>
            <div style={{ display: "grid", gap: 10 }}>
              <input className="search-input" placeholder="nome" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <input className="search-input" placeholder="descrição" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              {editing.is_managed && (
                <div className="muted" style={{ fontSize: 12 }}>
                  Este papel é gerenciado. Apenas nome e descrição podem ser alterados; 
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn primary" onClick={handleEdit} disabled={updateRole.isPending}>
                {updateRole.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RolePermissionsEditor({
  catalogue,
  byKey,
  allowed,
  onToggle,
  busy,
}: {
  catalogue: Array<{ key: string; category: string; description?: string }>;
  byKey: Map<string, { source: "own" | "inherited" }>;
  allowed: Set<string>;
  onToggle: (key: string) => void;
  busy: boolean;
}) {
  // Show only permissions inside the ceiling, so the tenant doesn't see
  // entries it can never enable. Inherited (locked) ones are guaranteed
  // to be in the allowed set already.
  const visible = useMemo(
    () => catalogue.filter((p) => allowed.has(p.key) || byKey.has(p.key)),
    [catalogue, allowed, byKey],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const p of visible) {
      const arr = map.get(p.category) || [];
      arr.push(p);
      map.set(p.category, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.key.localeCompare(b.key));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);

  if (visible.length === 0) {
    return <div className="muted">Sem permissões disponíveis nesse template.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {grouped.map(([category, perms]) => (
        <div key={category}>
          <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
            {category}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 6 }}>
            {perms.map((p) => {
              const entry = byKey.get(p.key);
              const inherited = entry?.source === "inherited";
              const owned = entry?.source === "own";
              const checked = !!entry;
              return (
                <label
                  key={p.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    cursor: inherited ? "not-allowed" : busy ? "wait" : "pointer",
                    background: inherited
                      ? "rgb(99 102 241 / 0.06)"
                      : owned
                      ? "rgb(34 197 94 / 0.06)"
                      : "transparent",
                    opacity: inherited ? 0.85 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(p.key)}
                    disabled={inherited || busy}
                  />
                  <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                    <span className="mono" style={{ fontSize: 12 }}>
                      {p.key}
                      {inherited && <span className="muted" style={{ marginLeft: 8, fontSize: 10 }}>herdada</span>}
                      {owned && <span className="muted" style={{ marginLeft: 8, fontSize: 10 }}>custom</span>}
                    </span>
                    {p.description && (
                      <span className="muted" style={{ fontSize: 11, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.description}
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
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
