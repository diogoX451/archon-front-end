import { useState } from "react";
import { useCards, useDeleteCard, useCreateCard, useUpdateCard, useCardAnalytics } from "@shared/hooks/useCRM";
import type { BusinessCard, CreateCardInput, CardLink, CardLinkType } from "@shared/api/crm";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";

// ── Design tokens ─────────────────────────────────────────────────────────

const THEME_SWATCHES = [
  { id: "onyx",   bg: "#111111", label: "Onyx"   },
  { id: "bone",   bg: "#f0ebe2", label: "Bone"   },
  { id: "forest", bg: "#1e3a2a", label: "Forest" },
  { id: "slate",  bg: "#1e2a3a", label: "Slate"  },
  { id: "clay",   bg: "#c8452a", label: "Clay"   },
  { id: "chalk",  bg: "#f8f6f1", label: "Chalk", border: true },
  { id: "dusk",   bg: "#3a1e4a", label: "Dusk"   },
];

const ACCENT_SWATCHES = [
  { color: "#d4a017", label: "Gold"     },
  { color: "#e8724a", label: "Coral"    },
  { color: "#6ba3d6", label: "Blue"     },
  { color: "#7ab990", label: "Sage"     },
  { color: "#c8a0d8", label: "Lavender" },
  { color: "#f0ece4", label: "White"    },
  { color: "#888888", label: "Gray"     },
];

const LINK_DEFAULTS: Record<CardLinkType, { label: string; placeholder: string; prefix?: string }> = {
  instagram:  { label: "Instagram",  placeholder: "@username", prefix: "https://instagram.com/" },
  linkedin:   { label: "LinkedIn",   placeholder: "@username", prefix: "https://linkedin.com/in/" },
  twitter:    { label: "X / Twitter", placeholder: "@username", prefix: "https://x.com/" },
  whatsapp:   { label: "WhatsApp",   placeholder: "+55 11 99999-0000", prefix: "https://wa.me/" },
  email:      { label: "Email",      placeholder: "email@exemplo.com", prefix: "mailto:" },
  phone:      { label: "Telefone",   placeholder: "+55 11 99999-0000", prefix: "tel:" },
  website:    { label: "Website",    placeholder: "https://seusite.com" },
  custom:     { label: "Link",       placeholder: "https://..." },
};

const LINK_ICONS: Record<CardLinkType, string> = {
  instagram: "📷", linkedin: "💼", twitter: "𝕏",
  whatsapp: "💬", email: "✉️", phone: "📞",
  website: "🌐", custom: "🔗",
};

// ── Card mini preview ─────────────────────────────────────────────────────

const CARD_THEMES: Record<string, { bg: string; text: string; accent: string }> = {
  onyx:   { bg: "#111", text: "#f0ece4", accent: "#888" },
  bone:   { bg: "#f0ebe2", text: "#2a2420", accent: "#8a7a6a" },
  forest: { bg: "#1e3a2a", text: "#d4e8da", accent: "#7ab990" },
  slate:  { bg: "#1e2a3a", text: "#cdd8e8", accent: "#7aa0c8" },
  clay:   { bg: "#c8452a", text: "#fdf0ec", accent: "#ffc4b8" },
  chalk:  { bg: "#f8f6f1", text: "#111", accent: "#999" },
  dusk:   { bg: "#3a1e4a", text: "#e8d8f0", accent: "#c8a0d8" },
};

function CardPreview({ card }: { card: Partial<BusinessCard> & { name: string } }) {
  const c = CARD_THEMES[card.theme ?? "onyx"] ?? CARD_THEMES.onyx;
  const accent = card.accent_color || c.accent;
  const initials = card.name.split(" ").slice(0, 2).map(n => n[0]?.toUpperCase() ?? "").join("");

  return (
    <div style={{
      background: c.bg, borderRadius: 14, padding: "18px 20px",
      aspectRatio: "1.75", display: "flex", flexDirection: "column",
      justifyContent: "space-between", position: "relative", overflow: "hidden",
    }}>
      {/* top */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {card.avatar_url ? (
          <img src={card.avatar_url} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `2px solid ${accent}`, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: accent, opacity: 0.3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: c.text }}>
            {initials}
          </div>
        )}
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: accent, opacity: 0.8 }}>
            {[card.company, card.role].filter(Boolean).join(" · ") || "Empresa · Cargo"}
          </div>
        </div>
      </div>
      {/* name */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: c.text, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          {card.name || "Seu Nome"}
        </div>
        {(card.email || card.phone) && (
          <div style={{ fontSize: 9, color: accent, opacity: 0.7, marginTop: 4 }}>
            {card.email || card.phone}
          </div>
        )}
        {(card.links?.length ?? 0) > 0 && (
          <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
            {card.links!.slice(0, 4).map((l, i) => (
              <span key={i} style={{ fontSize: 10, background: `${accent}22`, color: accent, padding: "1px 6px", borderRadius: 99 }}>
                {LINK_ICONS[l.type]}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card item in grid ─────────────────────────────────────────────────────

function CardAnalyticsRow({ cardId }: { cardId: string }) {
  const { data } = useCardAnalytics(cardId);
  if (!data) return null;
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
        <b style={{ color: "var(--ink)" }}>{data.total_views}</b> views
      </span>
      <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
        <b style={{ color: "var(--ink)" }}>{data.unique_visitors}</b> únicos
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

  const btn: React.CSSProperties = {
    flex: 1, padding: "6px 10px", borderRadius: "var(--r-2)",
    border: "1px solid var(--line)", background: "var(--surface)",
    color: "var(--ink)", fontSize: 11, fontWeight: 500,
    fontFamily: "var(--font-sans)", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    textDecoration: "none",
  };

  return (
    <div style={{
      background: "var(--surface)", borderRadius: "var(--r-4)",
      border: "1px solid var(--line)", padding: 16,
      display: "flex", flexDirection: "column", gap: 10,
      boxShadow: "var(--shadow-1)",
    }}>
      <CardPreview card={card} />

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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
          <img src={card.qr_data_url} alt="QR" style={{ width: 96, height: 96, borderRadius: "var(--r-2)" }} />
          <span style={{ fontSize: 9, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 1 }}>vCard QR</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={copyLink} style={btn}>{copied ? "✓" : "Copiar"}</button>
        {card.qr_data_url && (
          <button onClick={() => setShowQR(v => !v)} style={{ ...btn, flex: "0 0 auto", background: showQR ? "var(--ink)" : "var(--surface)", color: showQR ? "#fff" : "var(--ink)" }}>QR</button>
        )}
        <a href={card.public_url || `/c/${card.slug}`} target="_blank" rel="noreferrer" style={btn}>Ver</a>
        <button onClick={() => del.mutate(card.id)} style={{ ...btn, flex: "0 0 auto", color: "var(--err)", borderColor: "transparent" }}>×</button>
      </div>
    </div>
  );
}

// ── Card editor ───────────────────────────────────────────────────────────

const INITIAL: CreateCardInput = {
  name: "", role: "", company: "", email: "", phone: "", site: "",
  avatar_url: "", accent_color: "#888888",
  theme: "onyx", layout: "classic", font: "bricolage",
  links: [],
};

function LinkEditor({ links, onChange }: { links: CardLink[]; onChange: (links: CardLink[]) => void }) {
  const add = (type: CardLinkType) => {
    const def = LINK_DEFAULTS[type];
    onChange([...links, { type, label: def.label, url: "" }]);
  };
  const update = (i: number, field: keyof CardLink, val: string) => {
    const next = links.map((l, idx) => idx === i ? { ...l, [field]: val } : l);
    onChange(next);
  };
  const remove = (i: number) => onChange(links.filter((_, idx) => idx !== i));

  const [adding, setAdding] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "6px 8px", borderRadius: "var(--r-1)",
    border: "1px solid var(--line)", background: "var(--bg)",
    color: "var(--ink)", fontFamily: "var(--font-sans)", fontSize: 12, outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {links.map((link, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{LINK_ICONS[link.type]}</span>
          <input
            value={link.label}
            onChange={e => update(i, "label", e.target.value)}
            style={{ ...inputStyle, width: 90 }}
            placeholder="Label"
          />
          <input
            value={link.url}
            onChange={e => update(i, "url", e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
            placeholder={LINK_DEFAULTS[link.type]?.placeholder ?? "URL"}
          />
          <button onClick={() => remove(i)} style={{ background: "none", border: "none", color: "var(--err)", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>×</button>
        </div>
      ))}

      {adding ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(Object.keys(LINK_DEFAULTS) as CardLinkType[]).map(type => (
            <button key={type} onClick={() => { add(type); setAdding(false); }} style={{
              padding: "5px 10px", borderRadius: "var(--r-2)",
              border: "1px solid var(--line)", background: "var(--surface)",
              color: "var(--ink)", fontSize: 11, cursor: "pointer",
              fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 4,
            }}>
              {LINK_ICONS[type]} {LINK_DEFAULTS[type].label}
            </button>
          ))}
          <button onClick={() => setAdding(false)} style={{ background: "none", border: "none", color: "var(--ink-3)", cursor: "pointer", fontSize: 11 }}>Cancelar</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{
          padding: "6px 10px", borderRadius: "var(--r-2)",
          border: "1px dashed var(--line)", background: "transparent",
          color: "var(--ink-3)", fontSize: 11, cursor: "pointer",
          fontFamily: "var(--font-sans)", textAlign: "left",
        }}>
          + Adicionar link social ou personalizado
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function CRMCardsPage() {
  const { data: cards = [], isLoading } = useCards();
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const [form, setForm] = useState<CreateCardInput>(INITIAL);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "7px 10px", borderRadius: "var(--r-2)",
    border: "1px solid var(--line)", background: "var(--surface)",
    color: "var(--ink)", fontFamily: "var(--font-sans)", fontSize: 13,
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 600,
    color: "var(--ink-3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingId) {
      updateCard.mutate({ id: editingId, input: form }, {
        onSuccess: () => { setForm(INITIAL); setShowForm(false); setEditingId(null); },
      });
    } else {
      createCard.mutate(form, {
        onSuccess: () => { setForm(INITIAL); setShowForm(false); },
      });
    }
  };

  const handleEdit = (card: BusinessCard) => {
    setForm({
      name: card.name, role: card.role ?? "", company: card.company ?? "",
      email: card.email ?? "", phone: card.phone ?? "", site: card.site ?? "",
      avatar_url: card.avatar_url ?? "", links: card.links ?? [],
      accent_color: card.accent_color ?? "#888888",
      theme: card.theme, layout: card.layout, font: card.font, colors: card.colors,
    });
    setEditingId(card.id);
    setShowForm(true);
  };

  const sectionTitle = (t: string) => (
    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, marginTop: 4 }}>{t}</div>
  );

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
            onClick={() => { setForm(INITIAL); setEditingId(null); setShowForm(v => !v); }}
            style={{
              padding: "7px 14px", borderRadius: "var(--r-3)",
              border: "none", background: "var(--ink)", color: "#fff",
              fontSize: 12, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer",
            }}
          >
            {showForm && !editingId ? "Cancelar" : "+ Novo cartão"}
          </button>
        </div>

        {/* Editor */}
        {showForm && (
          <form onSubmit={handleSubmit} style={{
            background: "var(--surface)", borderRadius: "var(--r-4)",
            border: "1px solid var(--line)", marginBottom: 24,
            boxShadow: "var(--shadow-2)", overflow: "hidden",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px" }}>
              {/* Left: form fields */}
              <div style={{ padding: 24, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Identidade */}
                {sectionTitle("Identidade")}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {/* Avatar preview */}
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", background: "var(--bg)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {form.avatar_url ? (
                        <img src={form.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 20, color: "var(--ink-4)" }}>
                          {form.name.split(" ").slice(0,2).map(n => n[0]?.toUpperCase() ?? "").join("") || "?"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>URL da Foto</label>
                    <input
                      value={form.avatar_url ?? ""}
                      onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))}
                      placeholder="https://..."
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {(["name","role","company","email","phone","site"] as const).map(f => (
                    <div key={f}>
                      <label style={labelStyle}>{f === "name" ? "Nome *" : f}</label>
                      <input
                        value={(form as unknown as Record<string, string>)[f] ?? ""}
                        onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                        required={f === "name"}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>

                {/* Visual */}
                {sectionTitle("Visual")}

                <div>
                  <label style={labelStyle}>Tema</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {THEME_SWATCHES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, theme: t.id as CreateCardInput["theme"] }))}
                        title={t.label}
                        style={{
                          width: 32, height: 32, borderRadius: "var(--r-2)",
                          background: t.bg, cursor: "pointer",
                          border: form.theme === t.id
                            ? "2px solid var(--ink)"
                            : t.border ? "1px solid var(--line)" : "2px solid transparent",
                          outline: form.theme === t.id ? "2px solid var(--accent-soft)" : "none",
                          outlineOffset: 1,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Cor de Destaque</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {ACCENT_SWATCHES.map(a => (
                      <button
                        key={a.color}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, accent_color: a.color }))}
                        title={a.label}
                        style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: a.color, cursor: "pointer",
                          border: form.accent_color === a.color
                            ? "2px solid var(--ink)"
                            : "2px solid transparent",
                          boxShadow: a.color === "#f0ece4" ? "0 0 0 1px var(--line)" : "none",
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={form.accent_color ?? "#888888"}
                      onChange={e => setForm(p => ({ ...p, accent_color: e.target.value }))}
                      title="Cor personalizada"
                      style={{ width: 28, height: 28, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0, background: "none" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Layout</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["classic","centered","minimal"] as const).map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, layout: l }))}
                        style={{
                          padding: "6px 14px", borderRadius: "var(--r-2)", cursor: "pointer",
                          fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
                          border: "1px solid var(--line)",
                          background: form.layout === l ? "var(--ink)" : "var(--surface)",
                          color: form.layout === l ? "#fff" : "var(--ink-2)",
                        }}
                      >
                        {l.charAt(0).toUpperCase() + l.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Links */}
                {sectionTitle("Links")}
                <LinkEditor
                  links={form.links ?? []}
                  onChange={links => setForm(p => ({ ...p, links }))}
                />

                <button
                  type="submit"
                  disabled={createCard.isPending || updateCard.isPending}
                  style={{
                    padding: "10px", borderRadius: "var(--r-3)",
                    border: "none", background: "var(--ink)", color: "#fff",
                    fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer",
                    marginTop: 4,
                  }}
                >
                  {createCard.isPending || updateCard.isPending
                    ? "Salvando..."
                    : editingId ? "Salvar alterações" : "Criar cartão"}
                </button>
              </div>

              {/* Right: live preview */}
              <div style={{ padding: 24, background: "var(--bg)", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Preview ao vivo</div>
                <CardPreview card={{ ...form, slug: "preview", active: true, id: "", tenant_id: "", owner_id: "", theme: form.theme ?? "onyx", layout: form.layout ?? "classic", font: form.font ?? "bricolage", created_at: "", updated_at: "" }} />
                <p style={{ fontSize: 11, color: "var(--ink-4)", margin: 0, lineHeight: 1.5 }}>
                  Assim ficará o cartão para quem acessar o link público.
                </p>
              </div>
            </div>
          </form>
        )}

        {isLoading && <p style={{ color: "var(--ink-3)", fontSize: 13 }}>Carregando...</p>}

        {!isLoading && cards.length === 0 && !showForm && (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--ink-4)", fontSize: 13 }}>
            Nenhum cartão criado. Clique em "+ Novo cartão" para começar.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {cards.map(c => (
            <div key={c.id} style={{ position: "relative" }}>
              <CardItem card={c} />
              <button
                onClick={() => handleEdit(c)}
                style={{
                  position: "absolute", top: 10, right: 10,
                  background: "var(--surface)", border: "1px solid var(--line)",
                  borderRadius: "var(--r-2)", padding: "3px 8px",
                  fontSize: 10, cursor: "pointer", color: "var(--ink-2)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
