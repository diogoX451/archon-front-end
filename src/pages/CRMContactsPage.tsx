import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useContacts, useCRMStats, useUpdateContact, useDeleteContact, useCreateContact } from "@shared/hooks/useCRM";
import type { ContactStatus, Contact, BroadcastInput } from "@shared/api/crm";
import { broadcastWhatsApp } from "@shared/api/crm";
import { listWhatsAppChannels } from "@shared/api/channels";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useConfirm, useToast } from "@shared/ui/feedback";

const STATUS_LABEL: Record<ContactStatus, string> = {
  novo:       "Novo",
  em_contato: "Em contato",
  cliente:    "Cliente",
  arquivado:  "Arquivado",
};

const STATUS_BADGE: Record<ContactStatus, { bg: string; color: string }> = {
  novo:       { bg: "var(--accent-soft)", color: "var(--accent-ink)" },
  em_contato: { bg: "var(--warn-soft)",   color: "oklch(0.56 0.14 75)" },
  cliente:    { bg: "var(--ok-soft)",     color: "oklch(0.46 0.13 150)" },
  arquivado:  { bg: "var(--bg)",          color: "var(--ink-3)" },
};

const PIPELINE: ContactStatus[] = ["novo", "em_contato", "cliente", "arquivado"];

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--ink)",
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-2)",
  padding: "7px 12px",
  outline: "none",
};

function tagsFromInput(value: string): string[] {
  return [...new Set(value.split(",").map(tag => tag.trim().toLowerCase()).filter(Boolean))];
}

function customFieldsFromInput(value: string): Record<string, string> {
  return Object.fromEntries(
    value.split("\n").map(line => line.split(":", 2).map(part => part.trim())).filter(([key, fieldValue]) => key && fieldValue),
  );
}

function customFieldsToInput(fields?: Record<string, string>): string {
  return Object.entries(fields ?? {}).map(([key, value]) => `${key}: ${value}`).join("\n");
}

function StatusBadge({ status }: { status: ContactStatus }) {
  const s = STATUS_BADGE[status];
  return (
    <span style={{
      padding: "2px 8px",
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.03em",
      background: s.bg,
      color: s.color,
      whiteSpace: "nowrap",
    }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function ContactRow({ contact, onStatus }: {
  contact: Contact;
  onStatus: (id: string, status: ContactStatus) => void;
}) {
  const del = useDeleteContact();
  const update = useUpdateContact();
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: contact.name,
    company: contact.company ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    status: contact.status,
    tags: contact.tags?.join(", ") ?? "",
    customFields: customFieldsToInput(contact.custom_fields),
  });

  if (editing) {
    return (
      <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
        <td colSpan={8} style={{ padding: "10px 16px" }}>
          <form
            onSubmit={e => {
              e.preventDefault();
              const { status, tags, customFields, ...editFields } = form;
              update.mutate({
                id: contact.id,
                input: {
                  ...editFields,
                  ...(status !== contact.status ? { status } : {}),
                  tags: tagsFromInput(tags),
                  custom_fields: customFieldsFromInput(customFields),
                },
              }, { onSuccess: () => setEditing(false) });
            }}
            style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
          >
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome *" style={{ ...inputStyle, flex: "1 1 150px" }} />
            <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Empresa" style={{ ...inputStyle, flex: "1 1 130px" }} />
            <input value={form.email} type="email" onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" style={{ ...inputStyle, flex: "1 1 150px" }} />
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Telefone" style={{ ...inputStyle, flex: "1 1 110px" }} />
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Tags separadas por vírgula" style={{ ...inputStyle, flex: "1 1 190px" }} />
            <textarea value={form.customFields} onChange={e => setForm(f => ({ ...f, customFields: e.target.value }))} placeholder={"Campos personalizados\nconvênio: Saúde Plus"} rows={2} style={{ ...inputStyle, flex: "1 1 220px", resize: "vertical" }} />
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ContactStatus }))} style={{ ...inputStyle, minWidth: 120 }}>
              {PIPELINE.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <button type="submit" disabled={update.isPending} style={{ padding: "6px 14px", borderRadius: "var(--r-2)", border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer" }}>
              {update.isPending ? "…" : "Salvar"}
            </button>
            <button type="button" onClick={() => setEditing(false)} style={{ padding: "6px 12px", borderRadius: "var(--r-2)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 12, fontFamily: "var(--font-sans)", cursor: "pointer" }}>
              Cancelar
            </button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--line)" }}>
      <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--ink)", fontSize: 13 }}>
        {contact.name}
      </td>
      <td style={{ padding: "10px 16px", color: "var(--ink-3)", fontSize: 13 }}>
        {contact.company || <span style={{ color: "var(--ink-4)" }}>—</span>}
      </td>
      <td style={{ padding: "10px 16px", color: "var(--ink-3)", fontSize: 13 }}>
        {contact.email || <span style={{ color: "var(--ink-4)" }}>—</span>}
      </td>
      <td style={{ padding: "10px 16px", color: "var(--ink-3)", fontSize: 13 }}>
        {contact.phone || <span style={{ color: "var(--ink-4)" }}>—</span>}
      </td>
      <td style={{ padding: "10px 16px" }}>
        <StatusBadge status={contact.status} />
      </td>
      <td style={{ padding: "10px 16px", minWidth: 130 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {(contact.tags ?? []).length > 0 ? contact.tags.map(tag => (
            <span key={tag} style={{ padding: "2px 7px", borderRadius: 99, fontSize: 10, background: "var(--bg)", color: "var(--ink-2)", border: "1px solid var(--line)" }}>{tag}</span>
          )) : <span style={{ color: "var(--ink-4)" }}>—</span>}
        </div>
      </td>
      <td style={{ padding: "10px 16px" }}>
        <select
          value={contact.status}
          onChange={e => onStatus(contact.id, e.target.value as ContactStatus)}
          style={{
            fontSize: 12,
            padding: "4px 8px",
            borderRadius: "var(--r-2)",
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink)",
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {PIPELINE.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </td>
      <td style={{ padding: "10px 16px", display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => setEditing(true)}
          style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-sans)", padding: "2px 4px" }}
        >
          Editar
        </button>
        <button
          onClick={async () => {
            const ok = await confirm({
              title: "Remover contato",
              message: `Remover ${contact.name}? O histórico vinculado pode deixar de aparecer no CRM.`,
              confirmLabel: "Remover",
              destructive: true,
            });
            if (!ok) return;
            del.mutate(contact.id, {
              onSuccess: () => toast.success("Contato removido."),
              onError: (err) => toast.error(`Erro ao remover: ${err.message}`),
            });
          }}
          style={{ background: "none", border: "none", color: "var(--err)", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-sans)", padding: "2px 4px" }}
        >
          Remover
        </button>
      </td>
    </tr>
  );
}

const EMPTY_FORM = { name: "", company: "", email: "", phone: "", status: "novo" as ContactStatus, tags: "", customFields: "" };

export function CRMContactsPage() {
  const [filter, setFilter] = useState<ContactStatus | "">("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastStatuses, setBroadcastStatuses] = useState<string[]>(["novo", "em_contato"]);
  const [broadcastInstance, setBroadcastInstance] = useState("");

  const { data: contacts = [], isLoading, error } = useContacts({
    status: filter || undefined,
    q: search || undefined,
  });
  const { data: stats } = useCRMStats();
  const updateContact = useUpdateContact();
  const createContact = useCreateContact();
  const toast = useToast();
  const confirm = useConfirm();
  const waChannels = useQuery({
    queryKey: ["whatsapp-channels"],
    queryFn: () => listWhatsAppChannels(),
    enabled: showBroadcast,
  });
  const broadcastMutation = useMutation({
    mutationFn: (input: BroadcastInput) => broadcastWhatsApp(input),
    onSuccess: (result) => {
      toast.success(`Enviado para ${result.sent} contatos. Ignorados (sem telefone): ${result.skipped}.`);
      setShowBroadcast(false);
      setBroadcastMsg("");
    },
    onError: (err: Error) => toast.error(err.message || "Falha ao enviar broadcast"),
  });

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }} />
      </div>

      <div className="page-body">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: 0, flex: 1 }}>
            Contatos CRM
          </h1>
          {stats && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["novo", "em_contato", "cliente"] as const).map(s => (
                <span key={s} style={{
                  padding: "3px 10px",
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 600,
                  background: STATUS_BADGE[s].bg,
                  color: STATUS_BADGE[s].color,
                }}>
                  {STATUS_LABEL[s]}: {stats[s]}
                </span>
              ))}
              <span style={{
                padding: "3px 10px",
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 600,
                background: "var(--bg)",
                color: "var(--ink-3)",
                border: "1px solid var(--line)",
              }}>
                Total: {stats.total}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowBroadcast(v => !v)}
            style={{
              padding: "7px 14px",
              borderRadius: "var(--r-2)",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--ink)",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            📢 Broadcast WA
          </button>
          <button
            type="button"
            onClick={() => setShowForm(v => !v)}
            style={{
              padding: "7px 14px",
              borderRadius: "var(--r-2)",
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + Novo Contato
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            placeholder="Buscar por nome, empresa, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as ContactStatus | "")}
            style={{ ...inputStyle, minWidth: 160 }}
          >
            <option value="">Todos os status</option>
            {PIPELINE.map(s => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>

        {/* New contact form */}
        {showForm && (
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!newForm.name.trim()) return;
              const { status: _s, tags, customFields, ...input } = newForm;
              createContact.mutate({
                ...input,
                tags: tagsFromInput(tags),
                custom_fields: customFieldsFromInput(customFields),
              }, {
                onSuccess: () => { setShowForm(false); setNewForm(EMPTY_FORM); },
              });
            }}
            style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-4)", padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div style={{ fontWeight: 600, fontSize: 13 }}>Novo Contato</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input required placeholder="Nome *" value={newForm.name} onChange={e => setNewForm(f => ({...f, name: e.target.value}))} style={{...inputStyle, flex: "1 1 200px"}} />
              <input placeholder="Empresa" value={newForm.company} onChange={e => setNewForm(f => ({...f, company: e.target.value}))} style={{...inputStyle, flex: "1 1 160px"}} />
              <input placeholder="Email" type="email" value={newForm.email} onChange={e => setNewForm(f => ({...f, email: e.target.value}))} style={{...inputStyle, flex: "1 1 160px"}} />
              <input placeholder="Telefone" value={newForm.phone} onChange={e => setNewForm(f => ({...f, phone: e.target.value}))} style={{...inputStyle, flex: "1 1 120px"}} />
              <input placeholder="Tags: clínica, prioridade" value={newForm.tags} onChange={e => setNewForm(f => ({...f, tags: e.target.value}))} style={{...inputStyle, flex: "1 1 180px"}} />
              <select value={newForm.status} onChange={e => setNewForm(f => ({...f, status: e.target.value as ContactStatus}))} style={{...inputStyle, minWidth: 130}}>
                {PIPELINE.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <textarea
              value={newForm.customFields}
              onChange={e => setNewForm(f => ({ ...f, customFields: e.target.value }))}
              placeholder={"Campos personalizados, um por linha (opcional)\nconvênio: Saúde Plus\nunidade: Centro"}
              rows={3}
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={createContact.isPending} style={{ padding: "7px 16px", borderRadius: "var(--r-2)", border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer" }}>
                {createContact.isPending ? "Criando..." : "Criar"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: "7px 16px", borderRadius: "var(--r-2)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 13, fontFamily: "var(--font-sans)", cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {showBroadcast && (
          <form
            onSubmit={async e => {
              e.preventDefault();
              if (!broadcastMsg.trim() || !broadcastInstance) return;
              const selected = waChannels.data?.find(channel => channel.instance_name === broadcastInstance);
              const audience = contacts.filter(contact => broadcastStatuses.includes(contact.status));
              const reachable = audience.filter(contact => Boolean(contact.phone?.trim())).length;
              const ok = await confirm({
                title: "Confirmar broadcast",
                message: `Canal: ${selected?.display_name || broadcastInstance}. Audiência: ${audience.length} contato(s), ${reachable} com telefone. A mensagem será enviada imediatamente.`,
                confirmLabel: `Enviar para até ${reachable}`,
                destructive: true,
              });
              if (!ok) return;
              broadcastMutation.mutate({ message: broadcastMsg, statuses: broadcastStatuses, instance_id: broadcastInstance });
            }}
            style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-4)", padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              📢 Broadcast WhatsApp
              <span style={{ fontSize: 11, fontWeight: 400, color: "var(--ink-3)" }}>— envia mensagem a contatos selecionados</span>
            </div>

            {/* Channel selector */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 4 }}>Canal WhatsApp</label>
              {waChannels.isLoading ? (
                <div style={{ fontSize: 12, opacity: 0.5 }}>Carregando canais...</div>
              ) : (
                <select
                  required
                  value={broadcastInstance}
                  onChange={e => setBroadcastInstance(e.target.value)}
                  style={{ padding: "7px 10px", borderRadius: "var(--r-2)", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 13, fontFamily: "var(--font-sans)", width: "100%", maxWidth: 320 }}
                >
                  <option value="">Selecione o canal...</option>
                  {(waChannels.data ?? []).map(ch => (
                    <option key={ch.id} value={ch.instance_name}>{ch.display_name || ch.instance_name} ({ch.phone_number || ch.state})</option>
                  ))}
                </select>
              )}
            </div>

            {/* Status filter */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>Audiência (status)</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["novo", "em_contato", "cliente"] as const).map(st => (
                  <label key={st} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={broadcastStatuses.includes(st)}
                      onChange={e => setBroadcastStatuses(prev => e.target.checked ? [...prev, st] : prev.filter(s => s !== st))}
                    />
                    {STATUS_LABEL[st]}
                  </label>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 4 }}>Mensagem</label>
              <textarea
                required
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
                placeholder="Olá {{nome}}, temos uma novidade para você..."
                rows={4}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--r-2)", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 13, fontFamily: "var(--font-sans)", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }}
              />
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{broadcastMsg.length} caracteres</div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="submit"
                disabled={broadcastMutation.isPending || !broadcastMsg.trim() || !broadcastInstance || broadcastStatuses.length === 0}
                style={{ padding: "7px 16px", borderRadius: "var(--r-2)", border: "none", background: "#16a34a", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer", opacity: (broadcastMutation.isPending || !broadcastMsg.trim() || !broadcastInstance || broadcastStatuses.length === 0) ? 0.5 : 1 }}
              >
                {broadcastMutation.isPending ? "Enviando..." : "🚀 Enviar Broadcast"}
              </button>
              <button type="button" onClick={() => setShowBroadcast(false)} style={{ padding: "7px 14px", borderRadius: "var(--r-2)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 13, fontFamily: "var(--font-sans)", cursor: "pointer" }}>
                Cancelar
              </button>
              {broadcastMutation.isError && (
                <span style={{ fontSize: 12, color: "#dc2626" }}>Erro ao enviar. Verifique o canal.</span>
              )}
            </div>
          </form>
        )}

        {/* States */}
        {isLoading && (
          <p style={{ color: "var(--ink-3)", fontSize: 13 }}>Carregando...</p>
        )}
        {error && (
          <p style={{ color: "var(--err)", fontSize: 13 }}>Erro ao carregar contatos.</p>
        )}
        {!isLoading && contacts.length === 0 && (
          <div style={{
            padding: "48px 0",
            textAlign: "center",
            color: "var(--ink-4)",
            fontSize: 13,
          }}>
            Nenhum contato encontrado.
          </div>
        )}

        {/* Table */}
        {contacts.length > 0 && (
          <div style={{
            background: "var(--surface)",
            borderRadius: "var(--r-4)",
            border: "1px solid var(--line)",
            overflow: "hidden",
            boxShadow: "var(--shadow-1)",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--line)" }}>
                  {["Nome", "Empresa", "Email", "Telefone", "Status", "Tags", "Mover", ""].map(h => (
                    <th key={h} style={{
                      padding: "9px 16px",
                      textAlign: "left",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--ink-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      fontFamily: "var(--font-sans)",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <ContactRow
                    key={c.id}
                    contact={c}
                    onStatus={(id, status) => updateContact.mutate({ id, input: { status } })}
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
