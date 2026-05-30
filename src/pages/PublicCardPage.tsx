import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getPublicCard, type BusinessCard, type CreateContactInput } from "@shared/api/crm";

// ── Theme ──────────────────────────────────────────────────────────────

const THEMES: Record<string, { bg: string; text: string; accent: string; border: string }> = {
  onyx:   { bg: "#111111", text: "#f0ece4", accent: "#888888", border: "rgba(255,255,255,0.08)" },
  bone:   { bg: "#f0ebe2", text: "#2a2420", accent: "#8a7a6a", border: "rgba(0,0,0,0.10)" },
  forest: { bg: "#1e3a2a", text: "#d4e8da", accent: "#7ab990", border: "rgba(255,255,255,0.10)" },
  slate:  { bg: "#1e2a3a", text: "#cdd8e8", accent: "#7aa0c8", border: "rgba(255,255,255,0.10)" },
  clay:   { bg: "#c8452a", text: "#fdf0ec", accent: "#ffc4b8", border: "rgba(255,255,255,0.20)" },
  chalk:  { bg: "#ffffff", text: "#111111", accent: "#999999", border: "rgba(0,0,0,0.08)" },
  dusk:   { bg: "#3a1e4a", text: "#e8d8f0", accent: "#c8a0d8", border: "rgba(255,255,255,0.12)" },
  custom: { bg: "#1a1a1a", text: "#f0ece4", accent: "#888888", border: "rgba(255,255,255,0.10)" },
};

// ── Card visual ───────────────────────────────────────────────────────────

function CardVisual({ card }: { card: BusinessCard }) {
  const c = card.colors
    ? { bg: card.colors.bg, text: card.colors.text, accent: card.colors.accent, border: card.colors.border }
    : (THEMES[card.theme] ?? THEMES.onyx);

  const tag = [card.company, card.role].filter(Boolean).join(" · ") || "";
  const contacts = [card.email, card.phone, card.site].filter(Boolean);

  const centered = card.layout === "centered";
  const minimal  = card.layout === "minimal";

  return (
    <div style={{
      background: c.bg, borderRadius: 20, padding: "32px 38px",
      aspectRatio: "1.75", display: "flex", flexDirection: "column",
      justifyContent: minimal ? "flex-end" : centered ? "center" : "space-between",
      alignItems: centered ? "center" : "flex-start",
      textAlign: centered ? "center" : "left",
      boxShadow: "0 24px 60px rgba(0,0,0,0.20)",
      width: "100%",
    }}>
      {!minimal && tag && (
        <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: c.accent, opacity: 0.75 }}>
          {tag}
        </div>
      )}
      <div>
        <div style={{ fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 600, color: c.text, lineHeight: 1.1, marginBottom: 4 }}>
          {card.name}
        </div>
        {minimal && tag && (
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: c.accent, opacity: 0.65 }}>
            {tag}
          </div>
        )}
        {!minimal && card.company && (
          <div style={{ fontSize: 13, color: c.accent, opacity: 0.7 }}>{card.company}</div>
        )}
      </div>
      {contacts.length > 0 && (
        <div style={{
          marginTop: centered ? 16 : "auto",
          paddingTop: minimal ? 0 : 14,
          borderTop: minimal ? "none" : `1px solid ${c.border}`,
          display: "flex", flexDirection: centered ? "column" : "row",
          flexWrap: "wrap", gap: centered ? 4 : 12,
          alignItems: centered ? "center" : "flex-start",
        }}>
          {contacts.map(p => (
            <span key={p} style={{ fontSize: 10, color: c.accent, opacity: 0.8 }}>{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Save contact flow ─────────────────────────────────────────────────────

function SaveContactSection({ card }: { card: BusinessCard }) {
  const [mode, setMode] = useState<"idle" | "picker" | "manual" | "done">("idle");
  const [form, setForm] = useState<{ name: string; email: string; phone: string; company: string }>({
    name: card.name, email: card.email ?? "", phone: card.phone ?? "", company: card.company ?? "",
  });
  const [saving, setSaving] = useState(false);

  const tryContactPicker = async () => {
    const nav = navigator as Navigator & { contacts?: { select: (f: string[], opts: object) => Promise<Array<{name?: string[]; email?: string[]; tel?: string[]; organization?: string[]}>> } };
    if (!nav.contacts) { setMode("manual"); return; }
    try {
      const res = await nav.contacts.select(["name","email","tel","organization"], { multiple: false });
      if (!res?.length) return;
      const ct = res[0];
      setForm({
        name: ct.name?.[0] ?? "",
        email: ct.email?.[0] ?? "",
        phone: ct.tel?.[0] ?? "",
        company: ct.organization?.[0] ?? "",
      });
      setMode("manual");
    } catch {
      setMode("manual");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const input: CreateContactInput & { source: string } = {
        name: form.name, email: form.email, phone: form.phone,
        company: form.company, source: "cartao",
      };
      await fetch("/api/v1/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      setMode("done");
    } catch {
      // best-effort
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid #e5e7eb", fontSize: 14,
    fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const,
  };

  if (mode === "done") {
    return (
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "16px 20px", textAlign: "center", color: "#15803d", fontSize: 14, fontWeight: 600 }}>
        ✓ Contato salvo com sucesso!
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Preencha seus dados para salvar o contato:</p>
        {(["name","email","phone","company"] as const).map(f => (
          <input key={f} placeholder={f === "name" ? "Nome *" : f === "email" ? "Email" : f === "phone" ? "Telefone" : "Empresa"}
            value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
            required={f === "name"} style={inputStyle}
          />
        ))}
        <button type="submit" disabled={saving} style={{
          padding: "12px", borderRadius: 10, border: "none",
          background: "#111", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          {saving ? "Salvando..." : "Salvar contato"}
        </button>
        <button type="button" onClick={() => setMode("idle")} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
      </form>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={tryContactPicker} style={{
        padding: "12px 16px", borderRadius: 10, border: "none",
        background: "#111", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        📱 Importar da agenda
      </button>
      <button onClick={() => setMode("manual")} style={{
        padding: "12px 16px", borderRadius: 10, border: "1px solid #e5e7eb",
        background: "#fff", color: "#111", fontSize: 14, fontWeight: 500, cursor: "pointer",
      }}>
        ✍️ Digitar dados
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function PublicCardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    getPublicCard(slug)
      .then(setCard)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTopColor: "#111", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 40 }}>404</div>
        <div>Cartão não encontrado.</div>
      </div>
    );
  }

  const theme = THEMES[card.theme] ?? THEMES.onyx;

  return (
    <div style={{
      minHeight: "100vh", background: theme.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 24 }}>
        <CardVisual card={card} />
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>Trocar contato</div>
          <SaveContactSection card={card} />
        </div>
      </div>
    </div>
  );
}
