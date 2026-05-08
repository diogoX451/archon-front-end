import React from "react";

export function DashboardPage() {
  return (
    <>
      <div className="page-topbar">
        <span className="page-title">Overview</span>
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">Painel geral</span>
        <div style={{ flex: 1 }}></div>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Archon Control Plane</h1>
        <p className="page-lead">
          Painel centralizado de controle operacional do Archon: disparo de conversa, inspeção de workflows, eventos de canal, profiles e operações RAG.
        </p>

        <div className="stat-grid">
          <div className="stat">
            <div className="label">Workflows ativos</div>
            <div className="value">28</div>
            <div className="delta">+4 este mês</div>
          </div>
          <div className="stat">
            <div className="label">Execuções (24h)</div>
            <div className="value">1.284</div>
            <div className="delta">+12%</div>
          </div>
          <div className="stat">
            <div className="label">Taxa de sucesso</div>
            <div className="value">98,4%</div>
            <div className="delta">+0,3pp</div>
          </div>
          <div className="stat">
            <div className="label">Agentes online</div>
            <div className="value">7 / 7</div>
            <div className="delta">100% saudáveis</div>
          </div>
        </div>

        <div className="section-head"><h2>Fluxo Recomendado</h2></div>
        <div className="card-grid">
          <div className="card">
            <div className="card-header">
              <div className="card-glyph" style={{ background: "oklch(0.95 0.025 248)", borderColor: "oklch(0.85 0.06 248)", color: "oklch(0.40 0.12 248)" }}>
                <strong>1</strong>
              </div>
              <div style={{ flex: 1 }}>
                <div className="card-title">Dispare um evento</div>
                <div className="card-sub">Execuções ou Conversation</div>
              </div>
            </div>
            <div className="card-desc">
              Acione workflows através da página de Execuções ou do chat Conversation. O bus NATS irá rotear o evento para os agentes corretos.
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-glyph" style={{ background: "oklch(0.95 0.03 155)", borderColor: "oklch(0.82 0.08 155)", color: "oklch(0.36 0.10 155)" }}>
                <strong>2</strong>
              </div>
              <div style={{ flex: 1 }}>
                <div className="card-title">Acompanhe a execução</div>
                <div className="card-sub">Workflow Builder</div>
              </div>
            </div>
            <div className="card-desc">
              Abra o editor visual para observar os nós em execução em tempo real. Inspecione agentes, conexões e logs de eventos no Event Bus.
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-glyph" style={{ background: "oklch(0.95 0.03 35)", borderColor: "oklch(0.82 0.10 35)", color: "oklch(0.42 0.14 35)" }}>
                <strong>3</strong>
              </div>
              <div style={{ flex: 1 }}>
                <div className="card-title">Verifique os resultados</div>
                <div className="card-sub">Logs e payloads</div>
              </div>
            </div>
            <div className="card-desc">
              Cada execução gera um payload de resultado final. Confira a saída, latências e status de cada agente envolvido na cadeia.
            </div>
          </div>
        </div>

        <div className="section-head"><h2>Atividade Recente</h2></div>
        <table className="table">
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Tenant</th>
              <th>Status</th>
              <th className="num">Duração</th>
              <th>Quando</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ cursor: "pointer" }}>
              <td style={{ fontWeight: 500 }}>Assistente de Clima</td>
              <td className="muted mono">acme_corp</td>
              <td><span className="pill" data-tone="ok"><span className="dot"></span>completed</span></td>
              <td className="num mono">1540ms</td>
              <td className="muted">há 12s</td>
            </tr>
            <tr style={{ cursor: "pointer" }}>
              <td style={{ fontWeight: 500 }}>Atendimento WhatsApp</td>
              <td className="muted mono">acme_corp</td>
              <td><span className="pill" data-tone="run"><span className="dot"></span>running</span></td>
              <td className="num mono"><span className="muted">—</span></td>
              <td className="muted">há 1m</td>
            </tr>
            <tr style={{ cursor: "pointer" }}>
              <td style={{ fontWeight: 500 }}>Pipeline RAG (PDF onboarding)</td>
              <td className="muted mono">tenant_med</td>
              <td><span className="pill" data-tone="ok"><span className="dot"></span>completed</span></td>
              <td className="num mono">4220ms</td>
              <td className="muted">há 3m</td>
            </tr>
            <tr style={{ cursor: "pointer" }}>
              <td style={{ fontWeight: 500 }}>Decision automation · churn</td>
              <td className="muted mono">tenant_fin</td>
              <td><span className="pill" data-tone="warn"><span className="dot"></span>blocked</span></td>
              <td className="num mono"><span className="muted">—</span></td>
              <td className="muted">há 8m</td>
            </tr>
            <tr style={{ cursor: "pointer" }}>
              <td style={{ fontWeight: 500 }}>Webhook GitHub → Slack</td>
              <td className="muted mono">acme_corp</td>
              <td><span className="pill" data-tone="ok"><span className="dot"></span>completed</span></td>
              <td className="num mono">540ms</td>
              <td className="muted">há 44m</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
