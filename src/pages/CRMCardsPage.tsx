import { useState } from "react";
import { useCards, useDeleteCard, useCreateCard, useCardAnalytics } from "@shared/hooks/useCRM";
import type { BusinessCard, CreateCardInput } from "@shared/api/crm";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";

// ── Theme preview ─────────────────────────────────────────────────────────

const CARD_THEMES: Record<string, { bg: string; text: string; accent: string }> = {
  onyx:   { bg: "#111", text: "#f0ece4", accent: "#888" },
  bone:   { bg: "#f0ebe2", text: "#2a2420", accent: "#8a7a6a" },
  forest: { bg: "#1e3a2a", text: "#d4e8da", accent: "#7ab990" },
  slate:  { bg: "#1e2a3a", text: "#cdd8e8", accent: "#7aa0c8" },
  clay:   { bg: "#c8452a", text: "#fdf0ec", accent: "#ffc4b8" },
  chalk:  { bg: "#fff",    text: "#111",    accent: "#999" },
  dusk:   { bg: "#3a1e4a", text: "#e8d8f0", accent: "#c8a0d8" },
  custom: { bg: "#1a1a1a", text: "#f0ece4", accent: "#888" },
};

function CardMiniPreview({ card }: { card: BusinessCard }) {
  const c = card.colors
    ? { bg: card.colors.bg, text: card.colors.text, accent: card.colors.accent }
    : (CARD_THEMES[card.theme] ?? CARD_THEMES.onyx);

  return (
    <div style={{
      background: c.bg,
      borderRadius: "var(--r-3)",
      padding: "14px 18px",
      aspectRatio: "1.75",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: c.text, lineHeight: 1.2 }}>
        {card.name}
      </div>
      {(card.role || card.company) && (
        <div style={{ fontSize: 9, color: c.accent, marginTop: 3, opacity: 0.8, letterSpacing: 1 }}>
          {[card.role, card.company].filter(Boolean).join(" · ")}
        </div>
      )}
    </div>
  );
}

function CardAnalyticsRow({ cardId }: { cardId: string }) {
  const { data } = useCardAnalytics(cardId);
  if (!data) return null;
  return (
    <div style={{ display: "flex", gap: 14, paddingTop: 8 }}>
      <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{data.total_views}</span> views
      </span>
      <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{data.unique_visitors}</span> únicos
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

  const btnBase: React.CSSProperties = {
    flex: 1,
    padding: "6px 10px",
    borderRadius: "var(--r-2)",
    border: "1px solid var(--line)",
    background: "var(--surface)",
    color: "var(--ink)",
    fontSize: 11,
    fontWeight: 500,
    fontFamily: "var(--font-sans)",
    cursor: "pointer",
    textAlign: "center" as const,
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={{
      background: "var(--surface)",
      borderRadius: "var(--r-4)",
      border: "1px solid var(--line)",
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      boxShadow: "var(--shadow-1)",
    }}>
      <CardMiniPreview card={card} />

      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{card.name}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
          {[card.role, card.company].filter(Boolean).join(" · ") || "—"}
        </div>
        <div style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
          /c/{card.slug}
        </div>
      </div>

      <CardAnalyticsRow cardId={card.id} />

      {showQR && card.qr_data_url && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          padding: "8px 0",
          borderTop: "1px solid var(--line)",
        }}>
          <img src={card.qr_data_url} alt="QR Code" style={{ width: 100, height: 100, borderRadius: "var(--r-2)" }} />
          <span style={{ fontSize: 9, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 1 }}>vCard QR</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={copyLink} style={btnBase}>
          {copied ? "✓ Copiado" : "Copiar link"}
        </button>
        {card.qr_data_url && (
          <button
            onClick={() => setShowQR(v => !v)}
            style={{ ...btnBase, flex: "0 0 auto", background: showQR ? "var(--ink)" : "var(--surface)", color: showQR ? "#fff" : "var(--ink)" }}
          >
            QR
          </button>
        )}
        <a
          href={card.public_url || `/c/${card.slug}`}
          target="_blank"
          rel="noreferrer"
          style={btnBase}
        >
          Ver
        </a>
        <button
          onClick={() => del.mutate(card.id)}
          style={{ ...btnBase, flex: "0 0 auto", color: "var(--err)", borderColor: "var(--err-soft)" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

const INITIAL: CreateCardInput = {
  name: "", role: "", company: "", email: "", phone: "",
  theme: "onyx", layout: "classic", font: "bricolage",
};

export function CRMCardsPage() {
  const { data: cards = [], isLoading } = useCards();
  const createCard = useCreateCard();
  const [form, setForm] = useState<CreateCardInput>(INITIAL);
  const [showForm, setShowForm] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "7px 10px",
    borderRadius: "var(--r-2)",
    border: "1px solid var(--line)",
    background: "var(--surface)",
    color: "var(--ink)",
    fontFamily: "var(--font-sans)",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createCard.mutate(form, {
      onSuccess: () => { setForm(INITIAL); setShowForm(false); },
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <DynamicBreadcrumbs />

      <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: 0, flex: 1 }}>
            Cartões de Visita
          </h1>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              padding: "7px 14px",
              borderRadius: "var(--r-3)",
              border: "none",
              background: "var(--ink)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
            }}
          >
            {showForm ? "Cancelar" : "+ Novo cartão"}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} style={{
            background: "var(--surface)",
            borderRadius: "var(--r-4)",
            border: "1px solid var(--line)",
            padding: 20,
            marginBottom: 24,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            boxShadow: "var(--shadow-1)",
          }}>
            <h2 style={{ gridColumn: "1/-1", fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              Criar cartão
            </h2>
            {(["name", "role", "company", "email", "phone", "site"] as const).map(f => (
              <div key={f}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--ink-3)", marginBottom: 3, textTransform: "capitalize" }}>
                  {f === "name" ? "Nome *" : f}
                </label>
                <input
                  value={(form as unknown as Record<string, string>)[f] ?? ""}
                  onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  required={f === "name"}
                  style={inputStyle}
                />
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--ink-3)", marginBottom: 3 }}>Tema</label>
              <select value={form.theme} onChange={e => setForm(p => ({ ...p, theme: e.target.value as CreateCardInput["theme"] }))} style={inputStyle}>
                {Object.keys(CARD_THEMES).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--ink-3)", marginBottom: 3 }}>Layout</label>
              <select value={form.layout} onChange={e => setForm(p => ({ ...p, layout: e.target.value as CreateCardInput["layout"] }))} style={inputStyle}>
                {["classic", "centered", "minimal"].map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
              </select>
            </div>
            <button
              type="submit"
              disabled={createCard.isPending}
              style={{
                gridColumn: "1/-1",
                padding: "9px",
                borderRadius: "var(--r-3)",
                border: "none",
                background: "var(--ink)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
              }}
            >
              {createCard.isPending ? "Criando..." : "Criar cartão"}
            </button>
          </form>
        )}

        {isLoading && <p style={{ color: "var(--ink-3)", fontSize: 13 }}>Carregando...</p>}

        {!isLoading && cards.length === 0 && !showForm && (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--ink-4)", fontSize: 13 }}>
            Nenhum cartão criado. Clique em "+ Novo cartão" para começar.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {cards.map(c => <CardItem key={c.id} card={c} />)}
        </div>
      </div>
    </div>
  );
}
