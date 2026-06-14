import { useGetHealth } from "@shared/hooks/useHealth";
import { useCRMStats } from "@shared/hooks/useCRM";
import { useHandoffsList } from "@shared/hooks/useHandoffs";
import { useConversationsList } from "@shared/hooks/useConversationsHistory";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { IconConversation } from "@shared/ui/icons/Icons";
import { IconHandoffs, IconCRM, IconCard } from "@shared/ui/Rail";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, type CSSProperties } from "react";

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function StatCard({
  label, value, sub, tone, onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "ok" | "warn" | "err" | "run";
  onClick?: () => void;
}) {
  const colors: Record<string, string> = {
    ok: "var(--ok)",
    warn: "var(--warn)",
    err: "var(--err)",
    run: "oklch(0.55 0.13 248)",
  };
  return (
    <div
      className="stat"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default", transition: "box-shadow 0.15s" }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-2)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
    >
      <div className="label">{label}</div>
      <div className="value" style={tone ? { color: colors[tone] } : undefined}>
        {value}
      </div>
      {sub && <div className="delta">{sub}</div>}
    </div>
  );
}

type QuickLinkIcon = typeof IconConversation;

function QuickLink({
  label, to, Icon,
}: {
  label: string;
  to: string;
  Icon: QuickLinkIcon;
}) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav(to)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: "var(--r-3)",
        border: "1px solid var(--line)",
        background: "var(--surface)",
        color: "var(--ink)",
        fontSize: 13,
        fontWeight: 500,
        fontFamily: "var(--font-sans)",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s",
        width: "100%",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
      onMouseLeave={e => (e.currentTarget.style.background = "var(--surface)")}
    >
      <Icon size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
      {label}
    </button>
  );
}

const ONBOARDING_STEPS = [
  { label: "Conta criada", desc: "Workspace ativo e pronto.", done: true, to: null },
  { label: "Conectar canal", desc: "Vincule seu número de WhatsApp.", done: false, to: "/channels" },
  { label: "Configurar agente", desc: "Crie o perfil e as instruções do assistente.", done: false, to: "/profiles" },
  { label: "Testar conversa", desc: "Envie uma mensagem de teste e veja o agente responder.", done: false, to: "/conversation" },
] as const;

function WelcomeOverlay({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();

  const handleStep = (to: string | null) => {
    if (!to) return;
    onClose();
    nav(to);
  };

  return (
    <div style={overlayBg} role="dialog" aria-modal="true" aria-label="Bem-vindo ao Archon">
      <div style={overlayCard}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Bem-vindo ao Archon 👋</h2>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--ink-3)" }}>
              Siga os passos abaixo para ter seu assistente funcionando.
            </p>
          </div>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Fechar">✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ONBOARDING_STEPS.map((step, i) => (
            <button
              key={step.label}
              onClick={() => handleStep(step.to)}
              disabled={step.done}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                borderRadius: 12,
                border: step.done
                  ? "1px solid var(--ok)"
                  : "1px solid var(--line)",
                background: step.done ? "color-mix(in oklab, var(--ok) 8%, var(--surface))" : "var(--surface-2)",
                cursor: step.done ? "default" : "pointer",
                textAlign: "left",
                width: "100%",
                transition: "box-shadow 0.15s",
              }}
              onMouseEnter={e => { if (!step.done) e.currentTarget.style.boxShadow = "var(--shadow-2)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 999, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: step.done ? "var(--ok)" : "var(--line-strong)",
                color: step.done ? "#fff" : "var(--ink-3)",
                fontWeight: 700, fontSize: 13,
              }}>
                {step.done ? "✓" : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{step.label}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{step.desc}</div>
              </div>
              {!step.done && (
                <span style={{ fontSize: 13, color: "var(--accent-ink)", flexShrink: 0 }}>→</span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="btn"
          style={{ marginTop: 20, width: "100%", textAlign: "center" }}
        >
          Explorar o painel
        </button>
      </div>
    </div>
  );
}

const overlayBg: CSSProperties = {
  position: "fixed", inset: 0, zIndex: 8000,
  background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 20,
};

const overlayCard: CSSProperties = {
  width: "100%", maxWidth: 480,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 18,
  boxShadow: "var(--shadow-3)",
  padding: "28px 28px 24px",
};

const closeBtnStyle: CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: "var(--ink-3)", fontSize: 16, padding: 4, lineHeight: 1,
  flexShrink: 0,
};

export function DashboardPage() {
  const nav = useNavigate();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("archon:show_welcome") === "1") {
      sessionStorage.removeItem("archon:show_welcome");
      setShowWelcome(true);
    }
  }, []);

  const { data: health } = useGetHealth({ refetchInterval: 30_000 });
  const { data: stats } = useCRMStats();
  const { data: handoffsData } = useHandoffsList({ refetchInterval: 30_000 });
  const { data: convsPage } = useConversationsList(undefined, { limit: 8, refetchInterval: 30_000 });

  const convs = convsPage?.items ?? [];
  const handoffs = handoffsData?.handoffs ?? [];
  const pendingHandoffs = handoffs.filter(h => h.Status === "pending" || h.Status === "active").length;
  const isHealthy = health?.status === "healthy";

  const cardStyle = {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-3)",
    overflow: "hidden",
  } as const;

  const sectionLabel = {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--ink-3)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  };

  return (
    <>
      {showWelcome && <WelcomeOverlay onClose={() => setShowWelcome(false)} />}
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }} />
        <span className="pill" data-tone={isHealthy ? "ok" : "err"} style={{ fontSize: 11 }}>
          <span className="dot" />
          {isHealthy ? "online" : "offline"}
        </span>
      </div>

      <div className="page-body">
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="page-h1">Visão geral</h1>
          <p style={{ color: "var(--ink-3)", fontSize: 14, margin: "4px 0 0" }}>
            Conversas, contatos e atendimentos em tempo real.
          </p>
        </div>

        {/* Stat cards */}
        <div className="stat-grid">
          <StatCard
            label="Conversas"
            value={convs.length > 0 ? convs.length : "—"}
            sub="salvas"
            onClick={() => nav("/conversation")}
          />
          <StatCard
            label="Contatos"
            value={stats?.total ?? "—"}
            sub={stats ? `${stats.novo} novos` : undefined}
            onClick={() => nav("/crm/contacts")}
          />
          <StatCard
            label="Em negociação"
            value={stats?.em_contato ?? "—"}
            tone={stats && stats.em_contato > 0 ? "run" : undefined}
            sub="pipeline"
            onClick={() => nav("/crm/contacts")}
          />
          <StatCard
            label="Clientes"
            value={stats?.cliente ?? "—"}
            tone={stats && stats.cliente > 0 ? "ok" : undefined}
            sub="convertidos"
            onClick={() => nav("/crm/contacts")}
          />
          <StatCard
            label="Atendimentos"
            value={pendingHandoffs > 0 ? pendingHandoffs : (handoffs.length || "—")}
            tone={pendingHandoffs > 0 ? "warn" : undefined}
            sub={pendingHandoffs > 0 ? "aguardando" : "total"}
            onClick={() => nav("/handoffs")}
          />
          <StatCard
            label="Cartões"
            value="ver →"
            sub="de visita"
            onClick={() => nav("/crm/cards")}
          />
        </div>

        {/* Pipeline bar */}
        {stats && stats.total > 0 && (
          <div style={{ ...cardStyle, padding: "16px 18px", marginBottom: 20, overflow: "visible" }}>
            <div style={{ ...sectionLabel, marginBottom: 10 }}>
              Pipeline · Receita Previsível
            </div>
            <div style={{ display: "flex", gap: 2, height: 8, borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
              {[
                { key: "novo", color: "oklch(0.55 0.13 248)", pct: (stats.novo / stats.total) * 100 },
                { key: "em_contato", color: "var(--warn)", pct: (stats.em_contato / stats.total) * 100 },
                { key: "cliente", color: "var(--ok)", pct: (stats.cliente / stats.total) * 100 },
                { key: "arquivado", color: "var(--line-strong)", pct: (stats.arquivado / stats.total) * 100 },
              ].map(s => (
                <div key={s.key} style={{ width: `${s.pct}%`, background: s.color, minWidth: s.pct > 0 ? 4 : 0, borderRadius: 99 }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "Novo", count: stats.novo, color: "oklch(0.55 0.13 248)" },
                { label: "Em contato", count: stats.em_contato, color: "oklch(0.56 0.14 75)" },
                { label: "Cliente", count: stats.cliente, color: "oklch(0.46 0.13 150)" },
                { label: "Arquivado", count: stats.arquivado, color: "var(--ink-4)" },
              ].map(s => (
                <span key={s.label} style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>
                  {s.label} <span style={{ color: "var(--ink)", fontWeight: 700 }}>{s.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Two-column: conversations + right column — uses CSS class for responsive collapse */}
        <div className="dash-cols" style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, marginBottom: 20 }}>
          {/* Recent conversations */}
          <div style={cardStyle}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={sectionLabel}>Últimas conversas</span>
              <button onClick={() => nav("/conversation")} style={{ background: "none", border: "none", color: "oklch(0.55 0.13 248)", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                ver todas →
              </button>
            </div>
            {convs.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--ink-4)", fontSize: 13 }}>Nenhuma conversa ainda</div>
            ) : convs.slice(0, 6).map(c => (
              <div
                key={c.id}
                onClick={() => nav("/conversation")}
                style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                    {c.preview || c.conversation_id}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--ink-4)", flexShrink: 0 }}>{timeAgo(c.last_message_at || c.updated_at)}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                  {c.message_count} msg · {c.profile_id}
                </span>
              </div>
            ))}
          </div>

          {/* Right column — uses CSS class for mobile stacking */}
          <div className="dash-right-col" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Handoffs */}
            <div style={cardStyle}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={sectionLabel}>Atendimentos</span>
                {pendingHandoffs > 0 && (
                  <span style={{ background: "var(--warn-soft)", color: "oklch(0.56 0.14 75)", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99 }}>
                    {pendingHandoffs} pendentes
                  </span>
                )}
              </div>
              {handoffs.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--ink-4)", fontSize: 12 }}>Sem atendimentos</div>
              ) : handoffs.slice(0, 4).map(h => (
                <div
                  key={h.ID}
                  onClick={() => nav("/handoffs")}
                  style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  <span style={{ fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {(h.CorrelationID || h.ID || "").substring(0, 22)}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 99, flexShrink: 0, marginLeft: 8,
                    background: h.Status === "active" ? "var(--ok-soft)" : h.Status === "pending" ? "var(--warn-soft)" : "var(--bg)",
                    color: h.Status === "active" ? "var(--ok)" : h.Status === "pending" ? "var(--warn)" : "var(--ink-3)",
                  }}>
                    {h.Status}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick actions — platform icons */}
            <div style={{ ...cardStyle, padding: "14px" }}>
              <div style={{ ...sectionLabel, marginBottom: 10 }}>Ações rápidas</div>
              <div className="dash-quick-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <QuickLink label="Contatos" to="/crm/contacts" Icon={IconCRM} />
                <QuickLink label="Cartões" to="/crm/cards" Icon={IconCard} />
                <QuickLink label="Conversas" to="/conversation" Icon={IconConversation} />
                <QuickLink label="Atendimentos" to="/handoffs" Icon={IconHandoffs} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
