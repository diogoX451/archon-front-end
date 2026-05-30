import { useState } from "react";
import { useContacts, useCRMStats, useUpdateContact, useDeleteContact } from "@shared/hooks/useCRM";
import type { ContactStatus, Contact } from "@shared/api/crm";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";

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
      <td style={{ padding: "10px 16px" }}>
        <button
          onClick={() => del.mutate(contact.id)}
          style={{
            background: "none",
            border: "none",
            color: "var(--err)",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "var(--font-sans)",
            padding: "2px 4px",
          }}
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

  const { data: contacts = [], isLoading, error } = useContacts({
    status: filter || undefined,
    q: search || undefined,
  });
  const { data: stats } = useCRMStats();
  const updateContact = useUpdateContact();

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <DynamicBreadcrumbs />

      <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
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
                  {["Nome", "Empresa", "Email", "Telefone", "Status", "Mover", ""].map(h => (
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
    </div>
  );
}
