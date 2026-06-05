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
  bone:   { bg: "#f0ebe2", text: "#2a2420", accent: "#6b5a4a", muted: "rgba(42,36,32,0.65)",   line: "rgba(0,0,0,0.08)" },
  forest: { bg: "#1e3a2a", text: "#d4e8da", accent: "#7ab990", muted: "rgba(212,232,218,0.45)", line: "rgba(255,255,255,0.10)" },
  slate:  { bg: "#1e2a3a", text: "#cdd8e8", accent: "#7aa0c8", muted: "rgba(205,216,232,0.45)", line: "rgba(255,255,255,0.10)" },
  clay:   { bg: "#c8452a", text: "#fdf0ec", accent: "#ffc4b8", muted: "rgba(253,240,236,0.50)", line: "rgba(255,255,255,0.15)" },
  chalk:  { bg: "#f8f6f1", text: "#111111", accent: "#5a5550", muted: "rgba(17,17,17,0.60)",    line: "rgba(0,0,0,0.07)" },
  dusk:   { bg: "#3a1e4a", text: "#e8d8f0", accent: "#c8a0d8", muted: "rgba(232,216,240,0.45)", line: "rgba(255,255,255,0.10)" },
  custom: { bg: "#111111", text: "#f0ece4", accent: "#888888", muted: "rgba(240,236,228,0.45)", line: "rgba(255,255,255,0.08)" },
};

type CardThemeValues = typeof THEMES[string];
type PageThemeValues = CardThemeValues & {
  actionBg: string;
  actionText: string;
  fieldBg: string;
  surfaceBg: string;
};

type Copy = {
  notFound: string;
  qrAlt: string;
  scanToSave: string;
  saveContactOf: (name: string) => string;
  saveContact: string;
  saved: string;
  shareContactAria: (name: string) => string;
  saveHint: string;
  shareYourContact: string;
  sharedWith: (name: string) => string;
  yourDetailsFor: (name: string) => string;
  placeholders: Record<"name" | "email" | "phone" | "company", string>;
  sending: string;
  shareContact: string;
  cancel: string;
  introduceYourself: (name: string) => string;
  importFromContacts: string;
  typeDetails: string;
  exchangeTitle: (name: string) => string;
  exchangeHint: (name: string) => string;
  exchangeButton: string;
  exchanged: (name: string) => string;
};

const COPIES: Record<"pt" | "en" | "es", Copy> = {
  pt: {
    notFound: "Cartão não encontrado",
    qrAlt: "QR Code vCard",
    scanToSave: "Escaneie para salvar",
    saveContactOf: name => `Salvar contato de ${name}`,
    saveContact: "Salvar contato",
    saved: "Salvo!",
    shareContactAria: name => `Compartilhar contato de ${name}`,
    saveHint: "Abre o contato no celular quando o navegador permitir",
    shareYourContact: "Compartilhe o seu contato",
    sharedWith: name => `Contato compartilhado com ${name}`,
    yourDetailsFor: name => `Seus dados para ${name} salvar:`,
    placeholders: { name: "Seu nome *", email: "Email", phone: "Telefone", company: "Empresa" },
    sending: "Enviando...",
    shareContact: "Compartilhar contato",
    cancel: "Cancelar",
    introduceYourself: name => `Deixe ${name} te conhecer também.`,
    importFromContacts: "Importar da agenda",
    typeDetails: "Digitar dados",
    exchangeTitle: name => `Trocar contatos com ${name}`,
    exchangeHint: name => `Você salva o contato de ${name} e ${name} salva o seu.`,
    exchangeButton: "Trocar contatos",
    exchanged: name => `Contatos trocados com ${name}! O .vcf foi baixado.`,
  },
  en: {
    notFound: "Card not found",
    qrAlt: "vCard QR Code",
    scanToSave: "Scan to save",
    saveContactOf: name => `Save ${name}'s contact`,
    saveContact: "Save contact",
    saved: "Saved!",
    shareContactAria: name => `Share ${name}'s contact`,
    saveHint: "Opens the contact on mobile when the browser allows it",
    shareYourContact: "Share your contact",
    sharedWith: name => `Contact shared with ${name}`,
    yourDetailsFor: name => `Your details for ${name} to save:`,
    placeholders: { name: "Your name *", email: "Email", phone: "Phone", company: "Company" },
    sending: "Sending...",
    shareContact: "Share contact",
    cancel: "Cancel",
    introduceYourself: name => `Let ${name} know you too.`,
    importFromContacts: "Import from contacts",
    typeDetails: "Type details",
    exchangeTitle: name => `Exchange contacts with ${name}`,
    exchangeHint: name => `You save ${name}'s contact and ${name} saves yours.`,
    exchangeButton: "Exchange contacts",
    exchanged: name => `Contacts exchanged with ${name}! The .vcf was downloaded.`,
  },
  es: {
    notFound: "Tarjeta no encontrada",
    qrAlt: "Código QR vCard",
    scanToSave: "Escanea para guardar",
    saveContactOf: name => `Guardar contacto de ${name}`,
    saveContact: "Guardar contacto",
    saved: "Guardado!",
    shareContactAria: name => `Compartir contacto de ${name}`,
    saveHint: "Abre el contacto en el móvil cuando el navegador lo permite",
    shareYourContact: "Comparte tu contacto",
    sharedWith: name => `Contacto compartido con ${name}`,
    yourDetailsFor: name => `Tus datos para que ${name} los guarde:`,
    placeholders: { name: "Tu nombre *", email: "Email", phone: "Teléfono", company: "Empresa" },
    sending: "Enviando...",
    shareContact: "Compartir contacto",
    cancel: "Cancelar",
    introduceYourself: name => `Deja que ${name} también te conozca.`,
    importFromContacts: "Importar de contactos",
    typeDetails: "Escribir datos",
    exchangeTitle: name => `Intercambiar contactos con ${name}`,
    exchangeHint: name => `Tú guardas el contacto de ${name} y ${name} guarda el tuyo.`,
    exchangeButton: "Intercambiar contactos",
    exchanged: name => `¡Contactos intercambiados con ${name}! El .vcf fue descargado.`,
  },
};

const getCopy = () => {
  if (typeof navigator === "undefined") return COPIES.pt;
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("en")) return COPIES.en;
  if (lang.startsWith("es")) return COPIES.es;
  return COPIES.pt;
};

const isLightColor = (color: string) => {
  const hex = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
};

const getLuminance = (hex: string) => {
  const h = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(h)) return 0.5;
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(parseInt(h.slice(0, 2), 16));
  const g = toLinear(parseInt(h.slice(2, 4), 16));
  const b = toLinear(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (a: string, b: string) => {
  const l1 = getLuminance(a);
  const l2 = getLuminance(b);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
};

const enforceContrast = (accent: string, bg: string, minRatio = 4.5): string => {
  if (!/^#[0-9a-f]{6}$/i.test(accent)) return accent;
  if (contrastRatio(accent, bg) >= minRatio) return accent;
  const bgLight = isLightColor(bg);
  let r = parseInt(accent.slice(1, 3), 16);
  let g = parseInt(accent.slice(3, 5), 16);
  let b = parseInt(accent.slice(5, 7), 16);
  const step = bgLight ? -8 : 8;
  for (let i = 0; i < 32; i++) {
    r = Math.max(0, Math.min(255, r + step));
    g = Math.max(0, Math.min(255, g + step));
    b = Math.max(0, Math.min(255, b + step));
    const adjusted = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    if (contrastRatio(adjusted, bg) >= minRatio) return adjusted;
  }
  return bgLight ? "#1a1a1a" : "#e8e8e8";
};

const getCardTheme = (card: BusinessCard) => {
  const customColors = card.theme === "custom" ? card.colors : undefined;
  const base = customColors?.bg
    ? {
        bg: customColors.bg,
        text: customColors.text,
        accent: customColors.accent,
        muted: isLightColor(customColors.bg) ? "rgba(17,17,17,0.48)" : "rgba(240,236,228,0.52)",
        line: isLightColor(customColors.bg) ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.10)",
      }
    : (THEMES[card.theme] ?? THEMES.onyx);

  const rawAccent = card.accent_color || base.accent;
  return { ...base, accent: enforceContrast(rawAccent, base.bg) };
};

const getPageTheme = (theme: CardThemeValues): PageThemeValues => {
  const light = isLightColor(theme.bg);
  return {
    ...theme,
    text: light ? "#171717" : theme.text,
    muted: light ? "rgba(23,23,23,0.62)" : theme.muted,
    line: light ? "rgba(23,23,23,0.12)" : theme.line,
    actionBg: light ? "#171717" : theme.text,
    actionText: light ? "#ffffff" : theme.bg,
    fieldBg: light ? "#ffffff" : "rgba(255,255,255,0.06)",
    surfaceBg: light ? "#ffffff" : "rgba(255,255,255,0.07)",
  };
};

const escapeVCardValue = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const buildVCard = (card: BusinessCard) => [
  "BEGIN:VCARD",
  "VERSION:3.0",
  `FN:${escapeVCardValue(card.name)}`,
  card.company ? `ORG:${escapeVCardValue(card.company)}` : "",
  card.role ? `TITLE:${escapeVCardValue(card.role)}` : "",
  card.email ? `EMAIL;TYPE=INTERNET:${escapeVCardValue(card.email)}` : "",
  card.phone ? `TEL;TYPE=CELL:${escapeVCardValue(card.phone)}` : "",
  card.site ? `URL:${escapeVCardValue(card.site)}` : "",
  "END:VCARD",
].filter(Boolean).join("\r\n");

const getVCardFilename = (card: BusinessCard) =>
  `${card.name.replace(/\s+/g, "-").toLowerCase()}.vcf`;

const getVCardDataUrl = (card: BusinessCard) =>
  `data:text/vcard;charset=utf-8,${encodeURIComponent(buildVCard(card))}`;

// ── Card visual ───────────────────────────────────────────────────────────

function CardHero({ card }: { card: BusinessCard }) {
  const c = getCardTheme(card);
  const accent = c.accent;
  const tag = [card.company, card.role].filter(Boolean).join(" · ");
  const contacts = [card.email, card.phone, card.site].filter(Boolean);
  const centered = card.layout === "centered";
  const initials = card.name.split(" ").slice(0, 2).map(n => n[0]?.toUpperCase() ?? "").join("");

  const heroLight = isLightColor(c.bg);

  return (
    <div style={{
      background: c.bg,
      borderRadius: 20,
      padding: "28px 32px",
      minHeight: "clamp(160px, 54vw, 252px)",
      display: "flex",
      flexDirection: "column",
      justifyContent: centered ? "center" : card.layout === "minimal" ? "flex-end" : "space-between",
      alignItems: centered ? "center" : "flex-start",
      textAlign: centered ? "center" : "left",
      boxShadow: heroLight
        ? `0 8px 40px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.06)`
        : `0 32px 64px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.10)`,
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
        <div style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: accent, paddingRight: card.avatar_url ? 60 : 0 }}>
          {tag}
        </div>
      )}

      <div>
        <div style={{ fontSize: "clamp(20px, 5.5vw, 30px)", fontWeight: 600, color: c.text, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          {card.name}
        </div>
        {centered && tag && (
          <div style={{ fontSize: 12, letterSpacing: 2.5, textTransform: "uppercase", color: accent, marginTop: 8 }}>
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
              <span key={p} style={{ fontSize: 12, color: accent, letterSpacing: 0.3 }}>{p}</span>
            ))}
          </div>
        )}

        {/* Social links chips */}
        {(card.links?.length ?? 0) > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: contacts.length > 0 ? 8 : (centered ? 12 : 0) }}>
            {card.links!.map(link => (
              <a
                key={`${link.type}-${link.label}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                title={link.label}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 99,
                  background: `${accent}22`, color: accent,
                  fontSize: 12, fontWeight: 500, textDecoration: "none",
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

function SaveOwnerSection({ card, theme, copy }: { card: BusinessCard; theme: PageThemeValues; copy: Copy }) {
  const [saved, setSaved] = useState(false);
  const vcardHref = getVCardDataUrl(card);
  const vcardFilename = getVCardFilename(card);

  const downloadVCard = () => {
    const vcf = buildVCard(card);
    const a = document.createElement("a");
    const url = URL.createObjectURL(new Blob([vcf], { type: "text/vcard;charset=utf-8" }));
    a.href = url;
    a.download = vcardFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const shareCard = async () => {
    if (!navigator.share) { downloadVCard(); return; }
    try {
      const file = new File([buildVCard(card)], `${card.name.replace(/\s+/g, "-").toLowerCase()}.vcf`, { type: "text/vcard" });
      if ("canShare" in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Contato de ${card.name}`,
          files: [file],
        });
        return;
      }
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
        <a
          href={vcardHref}
          download={vcardFilename}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
          }}
          style={{
            flex: 1,
            padding: "11px 14px",
            borderRadius: 10,
            border: "none",
            background: theme.actionBg,
            color: theme.actionText,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "-0.01em",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          {saved ? `✓ ${copy.saved}` : copy.saveContact}
        </a>
        {typeof navigator.share !== "undefined" && (
          <button
            type="button"
            onClick={shareCard}
            aria-label={copy.shareContactAria(card.name)}
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
      <p style={{ fontSize: 12, color: theme.muted, margin: 0, textAlign: "center" }}>
        {copy.saveHint}
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

function ShareYourContact({ card, theme, copy }: { card: BusinessCard; theme: PageThemeValues; copy: Copy }) {
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
      // Download owner's VCF so visitor saves their contact too (contact exchange)
      const vcf = buildVCard(card);
      const url = URL.createObjectURL(new Blob([vcf], { type: "text/vcard" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = getVCardFilename(card);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMode("done");
    } catch { /* best-effort */ } finally { setSaving(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.line}`,
    background: theme.fieldBg,
    color: theme.text,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box" as const,
    WebkitAppearance: "none",
  };

  if (mode === "done") {
    return (
      <div style={{ textAlign: "center", padding: "8px 0", fontSize: 13, color: theme.accent, fontWeight: 500 }}>
        ✓ {copy.exchanged(card.name.split(" ")[0])}
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ fontSize: 12, color: theme.muted, margin: "0 0 4px" }}>
          {copy.yourDetailsFor(card.name.split(" ")[0])}
        </p>
        {(["name","email","phone","company"] as const).map(f => (
          <input
            key={f}
            aria-label={copy.placeholders[f].replace(" *", "")}
            placeholder={copy.placeholders[f]}
            value={form[f]}
            onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
            required={f === "name"}
            style={inputStyle}
          />
        ))}
        <button type="submit" disabled={saving} style={{
          padding: "14px",
          borderRadius: 10,
          border: "none",
          background: theme.actionBg,
          color: theme.actionText,
          fontSize: 14,
          fontWeight: 600,
          cursor: saving ? "default" : "pointer",
          fontFamily: "inherit",
          marginTop: 4,
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? copy.sending : copy.exchangeButton}
        </button>
        {hasContactPicker && (
          <button type="button" onClick={() => setMode("idle")} style={{
            background: "none", border: "none", color: theme.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
          }}>
            {copy.cancel}
          </button>
        )}
      </form>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ fontSize: 12, color: theme.muted, margin: 0 }}>
        {copy.introduceYourself(card.name.split(" ")[0])}
      </p>
      <button type="button" onClick={tryPicker} style={{
        padding: "11px",
        borderRadius: 10,
        border: `1px solid ${theme.line}`,
        background: theme.fieldBg,
        color: theme.text,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
      }}>
        {copy.importFromContacts}
      </button>
      <button type="button" onClick={() => setMode("manual")} style={{
        padding: "11px",
        borderRadius: 10,
        border: `1px solid ${theme.line}`,
        background: "transparent",
        color: theme.muted,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "inherit",
      }}>
        {copy.typeDetails}
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
    const copy = getCopy();
    return (
      <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111", color: "rgba(255,255,255,0.3)", flexDirection: "column", gap: 6, fontFamily: "system-ui" }}>
        <span style={{ fontSize: 32 }}>404</span>
        <span style={{ fontSize: 13 }}>{copy.notFound}</span>
      </div>
    );
  }

  const cardTheme = getCardTheme(card);
  const theme = getPageTheme(cardTheme);
  const copy = getCopy();

  // Detect light bg — luminance heuristic on hex color
  const isLight = isLightColor(cardTheme.bg);

  // Keep light brand colors on the card itself; use neutral surfaces for readable controls.
  const pageBgColor = isLight
    ? "linear-gradient(180deg, #f8f7f3 0%, #f1efe9 100%)"
    : cardTheme.bg;

  const panelStyle: React.CSSProperties = {
    background: theme.surfaceBg,
    border: `1px solid ${theme.line}`,
    borderRadius: 16,
    padding: "22px 24px",
    boxShadow: isLight ? "0 14px 34px rgba(27,27,23,0.08), 0 1px 3px rgba(27,27,23,0.06)" : "none",
  };

  return (
    <div style={{
      minHeight: "100svh",
      background: pageBgColor,
      color: theme.text,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: "clamp(20px, 5vw, 40px) clamp(14px, 4vw, 20px) 60px",
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
              <img src={card.qr_data_url} alt={copy.qrAlt} style={{ width: 120, height: 120, display: "block" }} />
            </div>
            <span style={{ fontSize: 12, color: theme.muted, letterSpacing: 2, textTransform: "uppercase" }}>
              {copy.scanToSave}
            </span>
          </div>
        )}

        {/* Save owner */}
        <div style={{ ...panelStyle }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 14 }}>
            {copy.saveContactOf(card.name.split(" ")[0])}
          </div>
          <SaveOwnerSection card={card} theme={theme} copy={copy} />
        </div>

        {/* Contact exchange */}
        <div style={{ ...panelStyle }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 4 }}>
            {copy.exchangeTitle(card.name.split(" ")[0])}
          </div>
          <p style={{ fontSize: 12, color: theme.muted, margin: "0 0 14px" }}>
            {copy.exchangeHint(card.name.split(" ")[0])}
          </p>
          <ShareYourContact card={card} theme={theme} copy={copy} />
        </div>
      </div>
    </div>
  );
}
