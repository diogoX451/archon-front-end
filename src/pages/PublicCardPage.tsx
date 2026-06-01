import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getPublicCard, type BusinessCard, type CreateContactInput, type CardLinkType } from "@shared/api/crm";
import { API_BASE_URL } from "@shared/api/client";

const LINK_ICONS: Record<CardLinkType, string> = {
  instagram: "📷", linkedin: "💼", twitter: "𝕏",
  whatsapp: "💬", email: "✉️", phone: "📞",
  website: "🌐", custom: "🔗",
};

// ── Theme palette ─────────────────────────────────────────────────────────

const THEMES: Record<string, { bg: string; text: string; accent: string; muted: string; line: string }> = {
  onyx:   { bg: "#111111", text: "#f0ece4", accent: "#888888", muted: "rgba(240,236,228,0.45)", line: "rgba(255,255,255,0.08)" },
  bone:   { bg: "#f0ebe2", text: "#2a2420", accent: "#8a7a6a", muted: "rgba(42,36,32,0.45)",   line: "rgba(0,0,0,0.08)" },
  forest: { bg: "#1e3a2a", text: "#d4e8da", accent: "#7ab990", muted: "rgba(212,232,218,0.45)", line: "rgba(255,255,255,0.10)" },
  slate:  { bg: "#1e2a3a", text: "#cdd8e8", accent: "#7aa0c8", muted: "rgba(205,216,232,0.45)", line: "rgba(255,255,255,0.10)" },
  clay:   { bg: "#c8452a", text: "#fdf0ec", accent: "#ffc4b8", muted: "rgba(253,240,236,0.50)", line: "rgba(255,255,255,0.15)" },
  chalk:  { bg: "#f8f6f1", text: "#111111", accent: "#999999", muted: "rgba(17,17,17,0.40)",    line: "rgba(0,0,0,0.07)" },
  dusk:   { bg: "#3a1e4a", text: "#e8d8f0", accent: "#c8a0d8", muted: "rgba(232,216,240,0.45)", line: "rgba(255,255,255,0.10)" },
  custom: { bg: "#111111", text: "#f0ece4", accent: "#888888", muted: "rgba(240,236,228,0.45)", line: "rgba(255,255,255,0.08)" },
};

// ── Card visual ───────────────────────────────────────────────────────────

function CardHero({ card }: { card: BusinessCard }) {
  const c = card.colors
    ? { bg: card.colors.bg, text: card.colors.text, accent: card.colors.accent, muted: "rgba(240,236,228,0.5)", line: "rgba(255,255,255,0.1)" }
    : (THEMES[card.theme] ?? THEMES.onyx);

  const accent = card.accent_color || c.accent;
  const tag = [card.company, card.role].filter(Boolean).join(" · ");
  const contacts = [card.email, card.phone, card.site].filter(Boolean);
  const centered = card.layout === "centered";
  const initials = card.name.split(" ").slice(0, 2).map(n => n[0]?.toUpperCase() ?? "").join("");

  const heroLight = (() => {
    const hex = c.bg.replace("#", "");
    if (hex.length < 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  })();

  return (
    <div style={{
      background: c.bg,
      borderRadius: 20,
      padding: "28px 32px",
      aspectRatio: "1.75",
      display: "flex",
      flexDirection: "column",
      justifyContent: centered ? "center" : card.layout === "minimal" ? "flex-end" : "space-between",
      alignItems: centered ? "center" : "flex-start",
      textAlign: centered ? "center" : "left",
      boxShadow: heroLight
        ? `0 24px 48px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.07)`
        : "0 32px 64px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.15)",
      width: "100%",
      position: "relative",
    }}>
      {/* Avatar */}
      {card.avatar_url ? (
        <div style={{ position: "absolute", top: 24, right: 28 }}>
          <img src={card.avatar_url} alt={card.name} style={{
            width: 44, height: 44, borderRadius: "50%", objectFit: "cover",
            border: `2px solid ${accent}`,
          }} />
        </div>
      ) : null}

      {!centered && tag && (
        <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: accent, opacity: 0.85 }}>
          {tag}
        </div>
      )}

      <div>
        <div style={{ fontSize: "clamp(20px, 5.5vw, 30px)", fontWeight: 600, color: c.text, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          {card.name}
        </div>
        {centered && tag && (
          <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: accent, opacity: 0.8, marginTop: 8 }}>
            {tag}
          </div>
        )}
      </div>

      <div>
        {contacts.length > 0 && (
          <div style={{
            paddingTop: centered ? 0 : 10,
            borderTop: centered ? "none" : `1px solid ${c.line}`,
            display: "flex", flexWrap: "wrap",
            gap: centered ? 6 : 12,
            flexDirection: centered ? "column" : "row",
            alignItems: centered ? "center" : "flex-start",
            marginTop: centered ? 12 : 0,
          }}>
            {contacts.map(p => (
              <span key={p} style={{ fontSize: 10, color: accent, opacity: 0.75, letterSpacing: 0.3 }}>{p}</span>
            ))}
          </div>
        )}

        {/* Social links chips */}
        {(card.links?.length ?? 0) > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: contacts.length > 0 ? 8 : (centered ? 12 : 0) }}>
            {card.links!.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                title={link.label}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 99,
                  background: `${accent}22`, color: accent,
                  fontSize: 10, fontWeight: 500, textDecoration: "none",
                  border: `1px solid ${accent}33`,
                }}
              >
                {LINK_ICONS[link.type as CardLinkType]} {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Save owner contact ────────────────────────────────────────────────────

function SaveOwnerSection({ card, theme }: { card: BusinessCard; theme: typeof THEMES[string] }) {
  const [saved, setSaved] = useState(false);

  const downloadVCard = () => {
    const vcf = [
      "BEGIN:VCARD", "VERSION:3.0",
      `FN:${card.name}`,
      card.company ? `ORG:${card.company}` : "",
      card.role    ? `TITLE:${card.role}` : "",
      card.email   ? `EMAIL:${card.email}` : "",
      card.phone   ? `TEL:${card.phone}` : "",
      card.site    ? `URL:${card.site}` : "",
      "END:VCARD",
    ].filter(Boolean).join("\r\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([vcf], { type: "text/vcard" }));
    a.download = `${card.name.replace(/\s+/g, "-").toLowerCase()}.vcf`;
    a.click();
    URL.revokeObjectURL(a.href);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const shareCard = async () => {
    if (!navigator.share) { downloadVCard(); return; }
    try {
      await navigator.share({
        title: card.name,
        text: [card.role, card.company].filter(Boolean).join(" · "),
        url: card.public_url || window.location.href,
      });
    } catch { /* cancelled */ }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={downloadVCard}
          style={{
            flex: 1,
            padding: "11px 14px",
            borderRadius: 10,
            border: "none",
            background: theme.text,
            color: theme.bg,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "-0.01em",
          }}
        >
          {saved ? "✓ Salvo!" : "Salvar contato"}
        </button>
        {typeof navigator.share !== "undefined" && (
          <button
            onClick={shareCard}
            style={{
              padding: "11px 16px",
              borderRadius: 10,
              border: `1px solid ${theme.line}`,
              background: "transparent",
              color: theme.text,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: 0.75,
            }}
          >
            ↗
          </button>
        )}
      </div>
      <p style={{ fontSize: 11, color: theme.muted, margin: 0, textAlign: "center" }}>
        Baixa o .vcf e abre no celular para salvar na agenda
      </p>
    </div>
  );
}

// ── Share your contact ────────────────────────────────────────────────────

// Contact Picker API (navigator.contacts) is only available on Android Chrome.
// Safari and iOS do not support it. We detect support and go straight to the
// manual form on unsupported browsers so the feature always works.
const hasContactPicker = typeof navigator !== "undefined" &&
  !!(navigator as Navigator & { contacts?: unknown }).contacts;

function ShareYourContact({ card, theme }: { card: BusinessCard; theme: typeof THEMES[string] }) {
  // Start in "manual" on Safari/iOS/desktop; "idle" only when picker is available.
  const [mode, setMode] = useState<"idle" | "manual" | "done">(hasContactPicker ? "idle" : "manual");
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [saving, setSaving] = useState(false);

  const tryPicker = async () => {
    const nav = navigator as Navigator & { contacts?: { select: (f: string[], opts: object) => Promise<Array<{name?: string[]; email?: string[]; tel?: string[]; organization?: string[]}>> } };
    if (!nav.contacts) { setMode("manual"); return; }
    try {
      const res = await nav.contacts.select(["name","email","tel","organization"], { multiple: false });
      if (!res?.length) return;
      const ct = res[0];
      setForm({ name: ct.name?.[0]??"", email: ct.email?.[0]??"", phone: ct.tel?.[0]??"", company: ct.organization?.[0]??"" });
      setMode("manual");
    } catch { setMode("manual"); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const input: CreateContactInput & { source: string } = { ...form, source: "cartao" };
      await fetch(`${API_BASE_URL}/api/v1/crm/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, tenant_id: card.tenant_id }),
      });
      setMode("done");
    } catch { /* best-effort */ } finally { setSaving(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${theme.line}`,
    background: "rgba(255,255,255,0.06)",
    color: theme.text,
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  if (mode === "done") {
    return (
      <div style={{ textAlign: "center", padding: "8px 0", fontSize: 13, color: theme.accent, fontWeight: 500 }}>
        ✓ Contato compartilhado com {card.name.split(" ")[0]}
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: 12, color: theme.muted, margin: 0 }}>
          Seus dados para {card.name.split(" ")[0]} salvar:
        </p>
        {(["name","email","phone","company"] as const).map(f => (
          <input
            key={f}
            placeholder={f === "name" ? "Seu nome *" : f === "email" ? "Email" : f === "phone" ? "Telefone" : "Empresa"}
            value={form[f]}
            onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
            required={f === "name"}
            style={inputStyle}
          />
        ))}
        <button type="submit" disabled={saving} style={{
          padding: "11px",
          borderRadius: 10,
          border: "none",
          background: theme.text,
          color: theme.bg,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}>
          {saving ? "Enviando..." : "Compartilhar contato"}
        </button>
        <button type="button" onClick={() => setMode("idle")} style={{
          background: "none", border: "none", color: theme.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
        }}>
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ fontSize: 12, color: theme.muted, margin: 0 }}>
        Deixe {card.name.split(" ")[0]} te conhecer também.
      </p>
      <button onClick={tryPicker} style={{
        padding: "11px",
        borderRadius: 10,
        border: `1px solid ${theme.line}`,
        background: "rgba(255,255,255,0.06)",
        color: theme.text,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
      }}>
        Importar da agenda
      </button>
      <button onClick={() => setMode("manual")} style={{
        padding: "11px",
        borderRadius: 10,
        border: `1px solid ${theme.line}`,
        background: "transparent",
        color: theme.muted,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "inherit",
      }}>
        Digitar dados
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
    getPublicCard(slug).then(setCard).catch(() => setError(true)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
        <div style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "rgba(255,255,255,0.7)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111", color: "rgba(255,255,255,0.3)", flexDirection: "column", gap: 6, fontFamily: "system-ui" }}>
        <span style={{ fontSize: 32 }}>404</span>
        <span style={{ fontSize: 13 }}>Cartão não encontrado</span>
      </div>
    );
  }

  const base = card.colors
    ? { bg: card.colors.bg, text: card.colors.text, accent: card.colors.accent, muted: "rgba(240,236,228,0.45)", line: "rgba(255,255,255,0.08)" }
    : (THEMES[card.theme] ?? THEMES.onyx);
  const theme = { ...base, accent: card.accent_color || base.accent };

  // Detect light bg — luminance heuristic on hex color
  const isLight = (() => {
    const hex = theme.bg.replace("#", "");
    if (hex.length < 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  })();

  const panelStyle: React.CSSProperties = {
    background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.07)",
    border: `1px solid ${isLight ? "rgba(0,0,0,0.08)" : theme.line}`,
    borderRadius: 16,
    padding: "20px 22px",
  };

  // For light themes, add a subtle radial gradient to break the flat look
  const pageBg = isLight
    ? `radial-gradient(ellipse 80% 60% at 50% 0%, ${theme.accent}18 0%, ${theme.bg} 65%)`
    : `radial-gradient(ellipse 80% 55% at 50% 0%, ${theme.accent}14 0%, ${theme.bg} 70%)`;

  return (
    <div style={{
      minHeight: "100svh",
      background: pageBg,
      backgroundColor: theme.bg,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: "40px 20px 60px",
      fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Card */}
        <CardHero card={card} />

        {/* QR Code */}
        {card.qr_data_url && (
          <div style={{ ...panelStyle, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px" }}>
            <div style={{ background: "#fff", padding: 12, borderRadius: 12, lineHeight: 0 }}>
              <img src={card.qr_data_url} alt="QR Code vCard" style={{ width: 120, height: 120, display: "block" }} />
            </div>
            <span style={{ fontSize: 10, color: theme.muted, letterSpacing: 2, textTransform: "uppercase" }}>
              Escaneie para salvar
            </span>
          </div>
        )}

        {/* Save owner */}
        <div style={{ ...panelStyle }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 14 }}>
            Salvar contato de {card.name.split(" ")[0]}
          </div>
          <SaveOwnerSection card={card} theme={theme} />
        </div>

        {/* Share yours */}
        <div style={{ ...panelStyle }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 14 }}>
            Compartilhe o seu contato
          </div>
          <ShareYourContact card={card} theme={theme} />
        </div>
      </div>
    </div>
  );
}
