import React, { useState } from "react";
import { IconPlus } from "@shared/ui/icons/Icons";

const PEOPLE = [
  ["Diogo Xavier", "diogo@acme.dev", "DX", "owner", "acme_corp", 14, 4820, "agora", "active"],
  ["Marina Costa", "marina@acme.dev", "MC", "architect", "acme_corp", 8, 2104, "há 8m", "active"],
  ["Renato Lima", "renato@acme.dev", "RL", "developer", "acme_corp", 6, 1842, "há 22m", "active"],
  ["Aline Souza", "aline@acme.dev", "AS", "developer", "acme_corp", 4, 920, "há 1h", "active"],
  ["Pedro Tavares", "pedro@acme.dev", "PT", "operator", "acme_corp", 2, 540, "há 3h", "active"],
  ["Camila Rocha", "camila@medatende.com.br", "CR", "architect", "tenant_med", 5, 1410, "há 4h", "active"],
  ["Bruno Mello", "bruno@medatende.com.br", "BM", "developer", "tenant_med", 3, 820, "ontem", "active"],
  ["Larissa Vidal", "larissa@medatende.com.br", "LV", "operator", "tenant_med", 2, 140, "há 2 dias", "active"],
  ["Gabriel Pinto", "gabriel@fintechbr.com", "GP", "architect", "tenant_fin", 4, 612, "há 6h", "active"],
  ["Helena Duarte", "helena@fintechbr.com", "HD", "developer", "tenant_fin", 3, 288, "há 1 dia", "active"],
  ["Rafael Brito", "rafael@acme.dev", "RB", "viewer", "acme_corp", 0, 0, "nunca", "invited"],
  ["Júlia Andrade", "julia@medatende.com.br", "JA", "viewer", "tenant_med", 0, 0, "nunca", "invited"],
];

const ROLE_STYLE: Record<string, React.CSSProperties> = {
  owner: { background: "oklch(0.94 0.04 60)", color: "oklch(0.42 0.14 60)", borderColor: "transparent" },
  architect: { background: "var(--accent-soft)", color: "var(--accent-ink)", borderColor: "transparent" },
  developer: {},
  operator: {},
  viewer: { background: "var(--surface-2)", color: "var(--ink-3)" },
};

export function ProfilesPage() {
  return (
    <>
      <div className="page-topbar">
        <span className="page-title">Usuários</span>
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">Membros da equipe</span>
        <div style={{ flex: 1 }}></div>
        <button className="btn primary">
          <IconPlus size={14} />
          Convidar
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Usuários</h1>
        <p className="page-lead">
          Membros da equipe com acesso ao painel Archon. Cada workflow exige <code style={{ fontFamily: "var(--font-mono)", fontSize: 13, background: "var(--surface)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--line)" }}>user_id</code> para rastreabilidade. Gerencie permissões por role e tenant.
        </p>

        <div className="stat-grid">
          <div className="stat"><div className="label">Total de membros</div><div className="value">14</div></div>
          <div className="stat"><div className="label">Ativos agora</div><div className="value" style={{ color: "oklch(0.45 0.13 60)" }}>10</div></div>
          <div className="stat"><div className="label">Convidados pendentes</div><div className="value">2</div></div>
          <div className="stat"><div className="label">Tenants</div><div className="value">3</div></div>
        </div>

        <div className="toolbar">
          <input className="search-input" placeholder="Buscar pessoa…" />
          <select className="field-select" style={{ width: "auto" }}>
            <option>Todos tenants</option><option>acme_corp</option><option>tenant_med</option><option>tenant_fin</option>
          </select>
          <select className="field-select" style={{ width: "auto" }}>
            <option>Todas roles</option><option>owner</option><option>architect</option><option>developer</option><option>operator</option><option>viewer</option>
          </select>
          <div className="grow"></div>
          <span style={{ color: "var(--ink-3)", fontSize: 13 }}>14 membros</span>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Pessoa</th>
              <th>Role</th>
              <th>Tenant</th>
              <th>Workflows</th>
              <th className="num">Execuções (30d)</th>
              <th>Última atividade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {PEOPLE.map((p, i) => (
              <tr key={i} style={{ cursor: "pointer" }}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar">{p[2]}</div>
                    <div>
                      <div className="name">{p[0]}</div>
                      <div className="email">{p[1]}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="pill" style={ROLE_STYLE[p[3] as string] || {}}>{p[3]}</span>
                </td>
                <td className="muted mono" style={{ fontSize: 12.5 }}>{p[4]}</td>
                <td className="num mono">{p[5]}</td>
                <td className="num mono">{(p[6] as number).toLocaleString("pt-BR")}</td>
                <td className="muted">{p[7]}</td>
                <td>
                  {p[8] === "active" ? (
                    <span className="pill" data-tone="ok"><span className="dot"></span>ativo</span>
                  ) : (
                    <span className="pill" data-tone="warn"><span className="dot"></span>convidado</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
