import { useState } from "react";
import { useContacts, useCRMStats, useUpdateContact, useDeleteContact } from "@shared/hooks/useCRM";
import type { ContactStatus, Contact } from "@shared/api/crm";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";

const STATUS_LABEL: Record<ContactStatus, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  cliente: "Cliente",
  arquivado: "Arquivado",
};

const STATUS_COLORS: Record<ContactStatus, { bg: string; color: string }> = {
  novo:       { bg: "#dbeafe", color: "#1d4ed8" },
  em_contato: { bg: "#fef3c7", color: "#b45309" },
  cliente:    { bg: "#dcfce7", color: "#15803d" },
  arquivado:  { bg: "#f3f4f6", color: "#6b7280" },
};

const PIPELINE: ContactStatus[] = ["novo", "em_contato", "cliente", "arquivado"];

function StatusBadge({ status }: { status: ContactStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span style={{
      padding: "2px 9px", borderRadius: 99, fontSize: 11,
      fontWeight: 600, letterSpacing: "0.04em",
      background: c.bg, color: c.color,
    }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function ContactRow({ contact, onStatus }: { contact: Contact; onStatus: (id: string, status: ContactStatus) => void }) {
  const del = useDeleteContact();
  return (
    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
      <td style={{ padding: "10px 12px", fontWeight: 500 }}>{contact.name}</td>
      <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 13 }}>{contact.company || "—"}</td>
      <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 13 }}>{contact.email || "—"}</td>
      <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 13 }}>{contact.phone || "—"}</td>
      <td style={{ padding: "10px 12px" }}>
        <StatusBadge status={contact.status} />
      </td>
      <td style={{ padding: "10px 12px" }}>
        <select
          value={contact.status}
          style={{ fontSize: 12, padding: "3px 6px", borderRadius: 6, border: "1px solid #e5e7eb" }}
          onChange={e => onStatus(contact.id, e.target.value as ContactStatus)}
        >
          {PIPELINE.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </td>
      <td style={{ padding: "10px 12px" }}>
        <button
          onClick={() => del.mutate(contact.id)}
          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13 }}
        >
          Remover
        </button>
      </td>
    </tr>
  );
}

export function CRMContactsPage() {
  const [filter, setFilter] = useState<ContactStatus | "">("");
  const [search, setSearch] = useState("");
  const { data: contacts = [], isLoading, error } = useContacts({ status: filter || undefined, q: search || undefined });
  const { data: stats } = useCRMStats();
  const updateContact = useUpdateContact();

  const handleStatus = (id: string, status: ContactStatus) => {
    updateContact.mutate({ id, input: { status } });
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
      <DynamicBreadcrumbs />
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, flex: 1 }}>Contatos CRM</h1>
        {stats && (
          <div style={{ display: "flex", gap: 12 }}>
            {(["novo", "em_contato", "cliente"] as const).map(s => (
              <div key={s} style={{
                padding: "6px 12px", borderRadius: 8,
                background: STATUS_COLORS[s].bg, color: STATUS_COLORS[s].color,
                fontSize: 12, fontWeight: 600,
              }}>
                {STATUS_LABEL[s]}: {stats[s]}
              </div>
            ))}
            <div style={{ padding: "6px 12px", borderRadius: 8, background: "#f3f4f6", color: "#374151", fontSize: 12, fontWeight: 600 }}>
              Total: {stats.total}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          placeholder="Buscar por nome, empresa, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as ContactStatus | "")}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
        >
          <option value="">Todos os status</option>
          {PIPELINE.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {isLoading && <p style={{ color: "#9ca3af" }}>Carregando...</p>}
      {error && <p style={{ color: "#ef4444" }}>Erro ao carregar contatos.</p>}
      {!isLoading && contacts.length === 0 && (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Nenhum contato encontrado.</p>
      )}
      {contacts.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              {["Nome", "Empresa", "Email", "Telefone", "Status", "Mover", ""].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contacts.map(c => (
              <ContactRow key={c.id} contact={c} onStatus={handleStatus} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
