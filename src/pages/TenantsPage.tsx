import React from "react";
import { IconPlus } from "@shared/ui/icons/Icons";

const TENANTS = [
  {
    initial: "A", name: "Acme Corp", slug: "acme_corp", status: "ativo", tone: "ok",
    hue: "248", members: 8, workflows: 22, ragBases: 3, plan: "scale",
    extra: "",
  },
  {
    initial: "M", name: "Med Atende", slug: "tenant_med", status: "ativo", tone: "ok",
    hue: "155", members: 4, workflows: 11, ragBases: 2, plan: "pro",
    extra: "",
  },
  {
    initial: "F", name: "FinTech Brasil", slug: "tenant_fin", status: "trial", tone: "warn",
    hue: "35", members: 2, workflows: 7, ragBases: 2, plan: "trial",
    extra: " · 7d restantes",
  },
];

export function TenantsPage() {
  return (
    <>
      <div className="page-topbar">
        <span className="page-title">Tenants</span>
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">Organizações e isolamento</span>
        <div style={{ flex: 1 }}></div>
        <button className="btn primary">
          <IconPlus size={14} />
          Novo tenant
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Tenants</h1>
        <p className="page-lead">
          Cada tenant é um namespace isolado. Operações RAG, workflows e conversas são segregadas por <code style={{ fontFamily: "var(--font-mono)", fontSize: 13, background: "var(--surface)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--line)" }}>tenant_id</code> via chaves Redis e metadata em vetor stores.
        </p>

        <div className="stat-grid">
          <div className="stat"><div className="label">Tenants ativos</div><div className="value">3</div></div>
          <div className="stat"><div className="label">Total de membros</div><div className="value">14</div></div>
          <div className="stat"><div className="label">Workflows totais</div><div className="value">40</div></div>
          <div className="stat"><div className="label">Bases RAG</div><div className="value">7</div></div>
        </div>

        <div className="card-grid">
          {TENANTS.map((t) => (
            <div key={t.slug} className="card" style={{ cursor: "pointer" }}>
              <div className="card-header">
                <div
                  className="card-glyph"
                  style={{
                    background: `oklch(0.95 0.025 ${t.hue})`,
                    borderColor: `oklch(0.85 0.06 ${t.hue})`,
                    color: `oklch(0.40 0.12 ${t.hue})`,
                  }}
                >
                  <strong>{t.initial}</strong>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="card-title">{t.name}</div>
                  <div className="card-sub">{t.slug}</div>
                </div>
                <span className="pill" data-tone={t.tone}>
                  <span className="dot"></span>{t.status}
                </span>
              </div>
              <div style={{ display: "flex", gap: 20, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>
                <div>
                  <div style={{ color: "var(--ink-4)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>membros</div>
                  <div style={{ color: "var(--ink)", fontSize: 16 }}>{t.members}</div>
                </div>
                <div>
                  <div style={{ color: "var(--ink-4)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>workflows</div>
                  <div style={{ color: "var(--ink)", fontSize: 16 }}>{t.workflows}</div>
                </div>
                <div>
                  <div style={{ color: "var(--ink-4)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>bases rag</div>
                  <div style={{ color: "var(--ink)", fontSize: 16 }}>{t.ragBases}</div>
                </div>
              </div>
              <div className="card-foot">
                <span>plano: {t.plan}{t.extra}</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>

        <div className="section-head" style={{ marginTop: 40 }}><h2>Uso por Tenant</h2></div>
        <table className="table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Plano</th>
              <th className="num">Membros</th>
              <th className="num">Workflows</th>
              <th className="num">Execuções (30d)</th>
              <th className="num">Bases RAG</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ cursor: "pointer" }}>
              <td style={{ fontWeight: 500 }}>Acme Corp</td>
              <td className="mono">scale</td>
              <td className="num mono">8</td>
              <td className="num mono">22</td>
              <td className="num mono">38.420</td>
              <td className="num mono">3</td>
              <td><span className="pill" data-tone="ok"><span className="dot"></span>ativo</span></td>
            </tr>
            <tr style={{ cursor: "pointer" }}>
              <td style={{ fontWeight: 500 }}>Med Atende</td>
              <td className="mono">pro</td>
              <td className="num mono">4</td>
              <td className="num mono">11</td>
              <td className="num mono">10.430</td>
              <td className="num mono">2</td>
              <td><span className="pill" data-tone="ok"><span className="dot"></span>ativo</span></td>
            </tr>
            <tr style={{ cursor: "pointer" }}>
              <td style={{ fontWeight: 500 }}>FinTech Brasil</td>
              <td className="mono">trial</td>
              <td className="num mono">2</td>
              <td className="num mono">7</td>
              <td className="num mono">1.320</td>
              <td className="num mono">2</td>
              <td><span className="pill" data-tone="warn"><span className="dot"></span>trial</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
