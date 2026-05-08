import React, { useState } from "react";
import { IconPlus } from "@shared/ui/icons/Icons";

const CONVERSATIONS = [
  { id: "conv_8a3f2c", profile: "suporte_acme", tenant: "acme_corp", messages: 12, status: "active", last: "há 2m", topic: "Dúvida sobre cobrança duplicada" },
  { id: "conv_4e9b21", profile: "triagem_med", tenant: "tenant_med", messages: 8, status: "active", last: "há 5m", topic: "Sintomas respiratórios + febre" },
  { id: "conv_2c1aa9", profile: "vendas_fin", tenant: "tenant_fin", messages: 24, status: "completed", last: "há 18m", topic: "Onboarding KYC para PJ" },
  { id: "conv_91dd02", profile: "suporte_acme", tenant: "acme_corp", messages: 6, status: "active", last: "há 22m", topic: "Reset de senha + 2FA" },
  { id: "conv_77ea4f", profile: "triagem_med", tenant: "tenant_med", messages: 14, status: "completed", last: "há 1h", topic: "Resultado de exame laboratorial" },
  { id: "conv_baf4e5", profile: "suporte_acme", tenant: "acme_corp", messages: 3, status: "waiting", last: "há 2h", topic: "Integração webhook Slack" },
  { id: "conv_36c8a2", profile: "vendas_fin", tenant: "tenant_fin", messages: 18, status: "completed", last: "há 3h", topic: "Upgrade plano scale → enterprise" },
  { id: "conv_d019cc", profile: "triagem_med", tenant: "tenant_med", messages: 2, status: "failed", last: "há 4h", topic: "Agendamento cancelado" },
];

const STATUS_TONE: Record<string, string> = { active: "run", completed: "ok", waiting: "warn", failed: "err" };
const STATUS_LABEL: Record<string, string> = { active: "ativa", completed: "concluída", waiting: "aguardando", failed: "falhou" };

export function ConversationPage() {
  const [tab, setTab] = useState("todas");

  return (
    <>
      <div className="page-topbar">
        <span className="page-title">Conversation</span>
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">Chat multi-turn com agentes</span>
        <div style={{ flex: 1 }}></div>
        <button className="btn primary">
          <IconPlus size={14} />
          Nova conversa
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Conversas</h1>
        <p className="page-lead">
          Cada conversa é uma sessão multi-turn vinculada a um perfil de agente conversacional. O contexto é mantido via memória de curto prazo (Redis) e longo prazo (graph store).
        </p>

        <div className="stat-grid">
          <div className="stat"><div className="label">Ativas agora</div><div className="value" style={{ color: "oklch(0.45 0.13 60)" }}>4</div></div>
          <div className="stat"><div className="label">Hoje</div><div className="value">38</div><div className="delta">+8 vs ontem</div></div>
          <div className="stat"><div className="label">Tempo médio</div><div className="value">4,2 min</div></div>
          <div className="stat"><div className="label">Satisfação</div><div className="value">94%</div><div className="delta">+2pp</div></div>
        </div>

        <div className="page-tabs">
          <button className="page-tab" data-active={tab === "todas"} onClick={() => setTab("todas")}>
            Todas <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-4)", marginLeft: 4 }}>8</span>
          </button>
          <button className="page-tab" data-active={tab === "ativas"} onClick={() => setTab("ativas")}>
            Ativas <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-4)", marginLeft: 4 }}>4</span>
          </button>
          <button className="page-tab" data-active={tab === "concluidas"} onClick={() => setTab("concluidas")}>Concluídas</button>
        </div>

        <div className="toolbar">
          <input className="search-input" placeholder="Buscar por tópico, profile, tenant…" />
          <select className="field-select" style={{ width: "auto" }}>
            <option>Todos tenants</option><option>acme_corp</option><option>tenant_med</option><option>tenant_fin</option>
          </select>
          <div className="grow"></div>
          <span style={{ color: "var(--ink-3)", fontSize: 13 }}>8 conversas</span>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tópico</th>
              <th>Profile</th>
              <th>Tenant</th>
              <th className="num">Mensagens</th>
              <th>Status</th>
              <th>Última msg</th>
            </tr>
          </thead>
          <tbody>
            {CONVERSATIONS.map((c) => (
              <tr key={c.id} style={{ cursor: "pointer" }}>
                <td className="mono">{c.id}</td>
                <td style={{ fontWeight: 500 }}>{c.topic}</td>
                <td className="mono muted" style={{ fontSize: 12 }}>{c.profile}</td>
                <td className="muted mono" style={{ fontSize: 12 }}>{c.tenant}</td>
                <td className="num mono">{c.messages}</td>
                <td>
                  <span className="pill" data-tone={STATUS_TONE[c.status]}>
                    <span className="dot"></span>{STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td className="muted">{c.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
