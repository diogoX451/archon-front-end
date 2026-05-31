import { useGetHealth } from "@shared/hooks/useHealth";
import { useCRMStats } from "@shared/hooks/useCRM";
import { useHandoffsList } from "@shared/hooks/useHandoffs";
import { useConversationsList } from "@shared/hooks/useConversationsHistory";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useNavigate } from "react-router-dom";

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

function QuickLink({ label, to, icon }: { label: string; to: string; icon: string }) {
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
      <span style={{ fontSize: 16 }}>{icon}</span>
      {label}
    </button>
  );
}

export function DashboardPage() {
  const nav = useNavigate();
  const { data: health } = useGetHealth({ refetchInterval: 30_000 });
  const { data: stats } = useCRMStats();
  const { data: handoffsData } = useHandoffsList({ refetchInterval: 30_000 });
  const { data: convsPage } = useConversationsList(undefined, { limit: 8, refetchInterval: 30_000 });

  const convs = convsPage?.items ?? [];
  const handoffs = handoffsData?.handoffs ?? [];
  const pendingHandoffs = handoffs.filter(h => h.Status === "pending" || h.Status === "active").length;
  const isHealthy = health?.status === "healthy";

  return (
    <div className="page">
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
            label="Contatos CRM"
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
          <div style={{
            background: "var(--surface)", border: "1px solid var(--line)",
            borderRadius: "var(--r-3)", padding: "16px 18px", marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
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

        {/* Two-column: conversations + handoffs/quick actions */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}>
          {/* Recent conversations */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Últimas conversas
              </span>
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

          {/* Right column: handoffs + quick actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Handoffs */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Atendimentos</span>
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

            {/* Quick actions */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", padding: "14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                Ações rápidas
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <QuickLink label="Contatos" to="/crm/contacts" icon="👤" />
                <QuickLink label="Cartões" to="/crm/cards" icon="🃏" />
                <QuickLink label="Conversas" to="/conversation" icon="💬" />
                <QuickLink label="Atendimentos" to="/handoffs" icon="🤝" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
