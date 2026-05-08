import React from "react";
import { IconPlus, IconRAG } from "@shared/ui/icons/Icons";

const KBS = [
  ["kb_suporte", "Suporte Acme", "acme_corp", 214, 8420, 90, "OpenAI text-embed-3"],
  ["kb_legal", "Documentos Legais", "acme_corp", 512, 32100, 72, "OpenAI text-embed-3"],
  ["kb_faq", "FAQ Produto", "acme_corp", 38, 940, 84, "OpenAI text-embed-3"],
  ["kb_clinico", "Base Clínica", "tenant_med", 1820, 98400, 65, "BGE-M3"],
  ["kb_contratos", "Contratos", "tenant_fin", 642, 48100, 52, "OpenAI text-embed-3"],
  ["kb_compliance", "Compliance", "tenant_fin", 256, 29800, 40, "OpenAI text-embed-3"],
];

const RECENT_DOCS = [
  { file: "politica-de-privacidade-v3.pdf", kb: "kb_legal", tenant: "acme_corp", type: "PDF", size: "1.2 MB", chunks: "42", status: "indexado", tone: "ok", time: "há 4m" },
  { file: "onboarding-clientes.docx", kb: "kb_suporte", tenant: "acme_corp", type: "DOCX", size: "340 KB", chunks: "18", status: "indexado", tone: "ok", time: "há 12m" },
  { file: "contratos-2026-q1.pdf", kb: "kb_legal", tenant: "tenant_fin", type: "PDF", size: "8.4 MB", chunks: "312", status: "processando", tone: "run", time: "há 18m" },
  { file: "faq-produto.txt", kb: "kb_faq", tenant: "acme_corp", type: "TXT", size: "86 KB", chunks: "9", status: "indexado", tone: "ok", time: "há 1h" },
  { file: "guia-medicamentos.pdf", kb: "kb_clinico", tenant: "tenant_med", type: "PDF", size: "22 MB", chunks: "—", status: "falhou", tone: "err", time: "há 2h" },
];

export function RagPage() {
  return (
    <>
      <div className="page-topbar">
        <span className="page-title">Bases RAG</span>
        <span className="page-sub" style={{ color: "var(--ink-4)" }}>/</span>
        <span className="page-sub">Knowledge bases vetoriais</span>
        <div style={{ flex: 1 }}></div>
        <button className="btn">
          <IconPlus size={14} />
          Ingerir documento
        </button>
        <button className="btn primary">
          <IconPlus size={14} />
          Nova base
        </button>
      </div>

      <div className="page-body">
        <h1 className="page-h1">Bases de Conhecimento</h1>
        <p className="page-lead">
          Cada base é um namespace de vetores isolado por tenant. Documentos passam por chunking + embedding e ficam disponíveis para query semântica nos agentes <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)" }}>rag-query</span>.
        </p>

        <div className="stat-grid">
          <div className="stat"><div className="label">Bases ativas</div><div className="value">12</div></div>
          <div className="stat"><div className="label">Documentos</div><div className="value">3.482</div><div className="delta">+128 hoje</div></div>
          <div className="stat"><div className="label">Chunks indexados</div><div className="value">218k</div></div>
          <div className="stat"><div className="label">Queries (24h)</div><div className="value">9.124</div><div className="delta">+18%</div></div>
        </div>

        <div className="card-grid">
          {KBS.map((k, i) => (
            <div key={i} className="card" style={{ cursor: "pointer" }}>
              <div className="card-header">
                <div className="card-glyph">
                  <IconRAG size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="card-title">{k[1]}</div>
                  <div className="card-sub">{k[0]} · {k[2]}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 18, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>
                <div><div style={{ color: "var(--ink-4)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>docs</div><div style={{ color: "var(--ink)", fontSize: 14 }}>{(k[3] as number).toLocaleString("pt-BR")}</div></div>
                <div><div style={{ color: "var(--ink-4)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>chunks</div><div style={{ color: "var(--ink)", fontSize: 14 }}>{(k[4] as number).toLocaleString("pt-BR")}</div></div>
                <div><div style={{ color: "var(--ink-4)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>embedding</div><div style={{ color: "var(--ink-2)", fontSize: 11.5 }}>{k[6]}</div></div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>
                  <span>cobertura semântica</span><span className="mono">{k[5]}%</span>
                </div>
                <div className="kbar"><div className="kbar-fill" style={{ width: `${k[5]}%` }} /></div>
              </div>
              <div className="card-foot">
                <span>top-k=5 · score≥0.5</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>

        <div className="section-head"><h2>Atividade Recente</h2></div>
        <table className="table">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Base</th>
              <th>Tenant</th>
              <th>Tipo</th>
              <th className="num">Tamanho</th>
              <th className="num">Chunks</th>
              <th>Status</th>
              <th>Ingerido</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_DOCS.map((doc, i) => (
              <tr key={i}>
                <td>{doc.file}</td>
                <td className="mono">{doc.kb}</td>
                <td className="muted mono">{doc.tenant}</td>
                <td className="muted">{doc.type}</td>
                <td className="num mono">{doc.size}</td>
                <td className="num mono">{doc.chunks}</td>
                <td><span className="pill" data-tone={doc.tone}><span className="dot"></span>{doc.status}</span></td>
                <td className="muted">{doc.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
