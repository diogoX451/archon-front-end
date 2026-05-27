import { useMemo, useState } from "react";
import { useAuth } from "@app/auth-context";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { IconPlus } from "@shared/ui/icons/Icons";
import {
  useCreateRoleTemplate,
  useDeleteRoleTemplate,
  useRoleTemplates,
  useUpdateRoleTemplate,
} from "@shared/hooks/useRoleTemplates";
import {
  useAssociateRolePermission,
  useDissociateRolePermission,
  useRoleEffectivePermissions,
} from "@shared/hooks/useRoles";
import { usePermissionsCatalogue } from "@shared/hooks/usePermissions";
import { useConfirm, useToast } from "@shared/ui/feedback";
import type { Role } from "@shared/api/roles";
import type { Permission } from "@shared/api/permissions";

// Super-admin-only console for the role-template catalogue. Editing a
// template here propagates to every tenant clone on the next login,
// because permission resolution walks the parent chain server-side.

export function PermissionsPage() {
  const { isSuper } = useAuth();

  const templatesQuery = useRoleTemplates();
  const catalogueQuery = usePermissionsCatalogue();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editing, setEditing] = useState<Role | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const createTemplate = useCreateRoleTemplate();
  const updateTemplate = useUpdateRoleTemplate();
  const deleteTemplate = useDeleteRoleTemplate();
  const associate = useAssociateRolePermission();
  const dissociate = useDissociateRolePermission();
  const toast = useToast();
  const confirm = useConfirm();

  const templates = templatesQuery.data || [];
  const catalogue = catalogueQuery.data || [];

  // Auto-select the first template once the list resolves so the right
  // pane is never empty when the page first opens.
  const effectiveId = selectedId || templates[0]?.id || null;
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === effectiveId) || null,
    [templates, effectiveId],
  );

  const effectiveQuery = useRoleEffectivePermissions(effectiveId);
  const ownedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const p of effectiveQuery.data || []) set.add(p.key);
    return set;
  }, [effectiveQuery.data]);

  if (!isSuper) {
    return (
      <div className="page-body">
        <h1 className="page-h1">Permissões</h1>
        <div className="card" style={{ borderColor: "var(--err)", color: "var(--err)" }}>
          Esta área é restrita ao super-admin.
        </div>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const tpl = await createTemplate.mutateAsync({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        resource_type: "tenant",
      });
      setSelectedId(tpl.id);
      setNewName("");
      setNewDescription("");
      setShowCreate(false);
      toast.success("Template criado.");
    } catch (err: any) {
      toast.error(`Erro ao criar template: ${err?.message || err}`);
    }
  };

  const openEdit = (tpl: Role) => {
    setEditing(tpl);
    setEditName(tpl.name);
    setEditDescription(tpl.description || "");
  };

  const handleEdit = async () => {
    if (!editing || !editName.trim()) return;
    try {
      await updateTemplate.mutateAsync({
        id: editing.id,
        input: {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        },
      });
      setEditing(null);
      toast.success("Template salvo.");
    } catch (err: any) {
      toast.error(`Erro ao salvar template: ${err?.message || err}`);
    }
  };

  const handleDelete = async (tpl: Role) => {
    const ok = await confirm({
      title: "Excluir template",
      message: `Tem certeza que quer excluir o template "${tpl.name}"? As clones gerenciadas em todos os tenants serão desvinculadas e os usuários perderão as permissões herdadas.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteTemplate.mutateAsync(tpl.id);
      if (effectiveId === tpl.id) setSelectedId(null);
      toast.success("Template excluído.");
    } catch (err: any) {
      toast.error(`Erro ao excluir: ${err?.message || err}`);
    }
  };

  const togglePermission = async (perm: Permission) => {
    if (!selectedTemplate) return;
    const hasIt = ownedKeys.has(perm.key);
    try {
      if (hasIt) {
        await dissociate.mutateAsync({ roleId: selectedTemplate.id, key: perm.key });
      } else {
        await associate.mutateAsync({ roleId: selectedTemplate.id, key: perm.key });
      }
    } catch (err: any) {
      toast.error(`Erro ao atualizar permissão: ${err?.message || err}`);
    }
  };

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }}></div>
        <button type="button" className="btn primary" onClick={() => setShowCreate(true)}>
          <IconPlus size={14} /> Novo template
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Permissões {"—"} templates de papéis</h1>
        <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
          Os templates definem o piso e o teto das permissões que os tenants podem usar. Mudanças aqui se aplicam a todos os tenants no próximo login.
        </p>

        {templatesQuery.error && (
          <div className="card" style={{ borderColor: "var(--err)", color: "var(--err)", marginBottom: 16 }}>
            Erro ao carregar templates: {(templatesQuery.error as Error).message}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
          {/* Templates list */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>
              Templates ({templatesQuery.isLoading ? "…" : templates.length})
            </div>
            <div>
              {templates.map((tpl) => {
                const active = effectiveId === tpl.id;
                return (
                  <button
                    type="button"
                    key={tpl.id}
                    onClick={() => setSelectedId(tpl.id)}
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
                    <div className="mono" style={{ fontWeight: 500, fontSize: 13 }}>
                      {tpl.name}
                    </div>
                    {tpl.description && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.35 }}>
                        {tpl.description}
                      </div>
                    )}
                  </button>
                );
              })}
              {templates.length === 0 && !templatesQuery.isLoading && (
                <div className="muted" style={{ padding: 16 }}>
                  Nenhum template ainda {"—"} crie o primeiro.
                </div>
              )}
            </div>
          </div>

          {/* Template detail + permission editor */}
          {selectedTemplate ? (
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 18 }}>{selectedTemplate.name}</div>
                  {selectedTemplate.description && (
                    <div className="muted" style={{ marginTop: 4 }}>{selectedTemplate.description}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn" onClick={() => openEdit(selectedTemplate)}>Editar</button>
                  <button type="button" className="btn" onClick={() => void handleDelete(selectedTemplate)} disabled={deleteTemplate.isPending}>
                    Excluir
                  </button>
                </div>
              </div>

              <div style={{ fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Permissões deste template</div>
              <p className="muted" style={{ marginTop: -4, marginBottom: 12, fontSize: 12 }}>
                Cada toggle aqui define o que tenants poderão atribuir em papéis filhos. Marque o piso mínimo + tudo que tenants podem opcionalmente ativar.
              </p>

              {catalogueQuery.isLoading ? (
                <div className="muted">Carregando catálogo…</div>
              ) : (
                <PermissionsByCategory
                  catalogue={catalogue}
                  ownedKeys={ownedKeys}
                  onToggle={togglePermission}
                  busy={associate.isPending || dissociate.isPending}
                />
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: 18 }}>
              <div className="muted">Selecione um template à esquerda ou crie um novo.</div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div style={overlayStyle} onClick={() => setShowCreate(false)}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Novo template</div>
            <div style={{ display: "grid", gap: 10 }}>
              <input className="search-input" placeholder="nome (ex.: template:supervisor)" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="Nome do template" />
              <input className="search-input" placeholder="descrição (opcional)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} aria-label="Descrição do template" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" className="btn" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button type="button" className="btn primary" onClick={handleCreate} disabled={createTemplate.isPending}>
                {createTemplate.isPending ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div style={overlayStyle} onClick={() => setEditing(null)}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Editar template</div>
            <div style={{ display: "grid", gap: 10 }}>
              <input className="search-input" placeholder="nome" value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Nome do template" />
              <input className="search-input" placeholder="descrição" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} aria-label="Descrição do template" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" className="btn" onClick={() => setEditing(null)}>Cancelar</button>
              <button type="button" className="btn primary" onClick={handleEdit} disabled={updateTemplate.isPending}>
                {updateTemplate.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PermissionsByCategory({
  catalogue,
  ownedKeys,
  onToggle,
  busy,
}: {
  catalogue: Permission[];
  ownedKeys: Set<string>;
  onToggle: (perm: Permission) => void;
  busy: boolean;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of catalogue) {
      const arr = map.get(p.category) || [];
      arr.push(p);
      map.set(p.category, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.key.localeCompare(b.key));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [catalogue]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {grouped.map(([category, perms]) => (
        <div key={category}>
          <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
            {category}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 6 }}>
            {perms.map((p) => {
              const checked = ownedKeys.has(p.key);
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
                    cursor: busy ? "wait" : "pointer",
                    background: checked ? "rgb(34 197 94 / 0.06)" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(p)}
                    disabled={busy}
                    aria-label={`Permissão ${p.key}`}
                  />
                  <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                    <span className="mono" style={{ fontSize: 12 }}>{p.key}</span>
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
