import { useState } from "react";
import { useCards, useDeleteCard, useCreateCard, useCardAnalytics } from "@shared/hooks/useCRM";
import type { BusinessCard, CreateCardInput } from "@shared/api/crm";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";

function CardPreview({ card }: { card: BusinessCard }) {
  const themeColors: Record<string, { bg: string; text: string; accent: string }> = {
    onyx:   { bg: "#111", text: "#f0ece4", accent: "#888" },
    bone:   { bg: "#f0ebe2", text: "#2a2420", accent: "#8a7a6a" },
    forest: { bg: "#1e3a2a", text: "#d4e8da", accent: "#7ab990" },
    slate:  { bg: "#1e2a3a", text: "#cdd8e8", accent: "#7aa0c8" },
    clay:   { bg: "#c8452a", text: "#fdf0ec", accent: "#ffc4b8" },
    chalk:  { bg: "#fff", text: "#111", accent: "#999" },
    dusk:   { bg: "#3a1e4a", text: "#e8d8f0", accent: "#c8a0d8" },
    custom: { bg: card.colors?.bg ?? "#111", text: card.colors?.text ?? "#f0ece4", accent: card.colors?.accent ?? "#888" },
  };
  const c = themeColors[card.theme] ?? themeColors.onyx;

  return (
    <div style={{
      background: c.bg, borderRadius: 12, padding: "20px 24px",
      aspectRatio: "1.75", display: "flex", flexDirection: "column",
      justifyContent: card.layout === "minimal" ? "flex-end" : card.layout === "centered" ? "center" : "space-between",
      alignItems: card.layout === "centered" ? "center" : "flex-start",
      textAlign: card.layout === "centered" ? "center" : "left",
      minWidth: 0,
    }}>
      {card.layout !== "minimal" && (
        <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: c.accent, opacity: 0.75 }}>
          {[card.company, card.role].filter(Boolean).join(" · ") || "Cargo · Empresa"}
        </div>
      )}
      <div>
        <div style={{ fontSize: 20, fontWeight: 600, color: c.text, lineHeight: 1.1, marginBottom: 3 }}>
          {card.name}
        </div>
        {card.layout === "minimal" && (
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: c.accent, opacity: 0.65 }}>
            {[card.company, card.role].filter(Boolean).join(" · ") || "Cargo · Empresa"}
          </div>
        )}
      </div>
    </div>
  );
}

function CardAnalyticsInline({ cardId }: { cardId: string }) {
  const { data } = useCardAnalytics(cardId);
  if (!data) return null;
  return (
    <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
      <span style={{ fontSize: 11, color: "#6b7280" }}>
        👁 <b style={{ color: "#111" }}>{data.total_views}</b> visualizações
      </span>
      <span style={{ fontSize: 11, color: "#6b7280" }}>
        🌐 <b style={{ color: "#111" }}>{data.unique_visitors}</b> únicos
      </span>
    </div>
  );
}

function CardItem({ card }: { card: BusinessCard }) {
  const del = useDeleteCard();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const copyLink = () => {
    const url = card.public_url || `${window.location.origin}/c/${card.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb",
      padding: 20, display: "flex", flexDirection: "column", gap: 12,
    }}>
      <CardPreview card={card} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{card.name}</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
          {[card.role, card.company].filter(Boolean).join(" · ") || "—"}
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
          /c/{card.slug}
        </div>
      </div>
      <CardAnalyticsInline cardId={card.id} />
      {showQR && card.qr_data_url && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 0", borderTop: "1px solid #f3f4f6" }}>
          <img src={card.qr_data_url} alt="QR Code" style={{ width: 120, height: 120, borderRadius: 6 }} />
          <span style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>vCard QR</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={copyLink}
          style={{
            flex: 1, padding: "7px 10px", borderRadius: 8,
            border: "1px solid #e5e7eb", background: "#f9fafb",
            fontSize: 12, cursor: "pointer", fontWeight: 500,
          }}
        >
          {copied ? "✓ Copiado!" : "Copiar link"}
        </button>
        {card.qr_data_url && (
          <button
            onClick={() => setShowQR(v => !v)}
            style={{
              padding: "7px 10px", borderRadius: 8,
              border: "1px solid #e5e7eb", background: showQR ? "#111" : "#f9fafb",
              color: showQR ? "#fff" : "#111", fontSize: 12, cursor: "pointer", fontWeight: 500,
            }}
          >
            QR
          </button>
        )}
        <a
          href={card.public_url || `/c/${card.slug}`}
          target="_blank"
          rel="noreferrer"
          style={{
            flex: 1, padding: "7px 10px", borderRadius: 8,
            border: "1px solid #e5e7eb", background: "#f9fafb",
            fontSize: 12, textDecoration: "none", color: "#111",
            fontWeight: 500, textAlign: "center",
          }}
        >
          Ver cartão
        </a>
        <button
          onClick={() => del.mutate(card.id)}
          style={{
            padding: "7px 10px", borderRadius: 8,
            border: "1px solid #fee2e2", background: "#fff5f5",
            fontSize: 12, cursor: "pointer", color: "#ef4444",
          }}
        >
          Remover
        </button>
      </div>
    </div>
  );
}

const INITIAL: CreateCardInput = { name: "", role: "", company: "", email: "", phone: "", theme: "onyx", layout: "classic", font: "bricolage" };

export function CRMCardsPage() {
  const { data: cards = [], isLoading } = useCards();
  const createCard = useCreateCard();
  const [form, setForm] = useState<CreateCardInput>(INITIAL);
  const [showForm, setShowForm] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createCard.mutate(form, {
      onSuccess: () => { setForm(INITIAL); setShowForm(false); },
    });
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
      <DynamicBreadcrumbs />
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, flex: 1 }}>Cartões de Visita</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            padding: "8px 16px", borderRadius: 10, border: "none",
            background: "#111", color: "#fff", fontSize: 13,
            fontWeight: 600, cursor: "pointer",
          }}
        >
          {showForm ? "Cancelar" : "+ Novo cartão"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{
          background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb",
          padding: 24, marginBottom: 28, display: "grid",
          gridTemplateColumns: "1fr 1fr", gap: 14,
        }}>
          <h2 style={{ gridColumn: "1/-1", fontSize: 16, fontWeight: 600, margin: 0 }}>Criar cartão</h2>
          {(["name", "role", "company", "email", "phone", "site"] as const).map(f => (
            <div key={f}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#6b7280", marginBottom: 4, textTransform: "capitalize" }}>{f === "name" ? "Nome *" : f}</label>
              <input
                value={(form as Record<string, string>)[f] ?? ""}
                onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                required={f === "name"}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
              />
            </div>
          ))}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#6b7280", marginBottom: 4 }}>Tema</label>
            <select value={form.theme} onChange={e => setForm(p => ({ ...p, theme: e.target.value as CreateCardInput["theme"] }))} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}>
              {["onyx","bone","forest","slate","clay","chalk","dusk"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#6b7280", marginBottom: 4 }}>Layout</label>
            <select value={form.layout} onChange={e => setForm(p => ({ ...p, layout: e.target.value as CreateCardInput["layout"] }))} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}>
              {["classic","centered","minimal"].map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={createCard.isPending}
            style={{ gridColumn: "1/-1", padding: 12, borderRadius: 10, border: "none", background: "#111", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            {createCard.isPending ? "Criando..." : "Criar cartão"}
          </button>
        </form>
      )}

      {isLoading && <p style={{ color: "#9ca3af" }}>Carregando...</p>}
      {!isLoading && cards.length === 0 && !showForm && (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>
          Nenhum cartão criado. Clique em "+ Novo cartão" para começar.
        </p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {cards.map(c => <CardItem key={c.id} card={c} />)}
      </div>
    </div>
  );
}
