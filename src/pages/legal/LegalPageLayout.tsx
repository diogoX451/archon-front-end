import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

type Props = {
  title: string;
  subtitle?: string;
  lastUpdated: string;
};

// LegalPageLayout is the shell every public legal page uses. Kept
// outside AppShell so unauthenticated visitors can read it. The amber
// banner flags the documents as draft until the legal review is signed
// off — remove the banner once Almexa's counsel approves the final text.
export function LegalPageLayout({ title, subtitle, lastUpdated, children }: PropsWithChildren<Props>) {
  return (
    <div className="legal-page" style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      <style>{`
        #root { overflow-x: hidden; overflow-y: auto; }
        .legal-header { border-bottom: 1px solid var(--line); padding: 20px 32px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .legal-brand { color: var(--ink); text-decoration: none; font-weight: 600; white-space: nowrap; }
        .legal-nav { display: flex; gap: 16px; font-size: 14px; }
        .legal-main { max-width: 760px; margin: 0 auto; padding: 32px 24px 96px; font-size: 15px; line-height: 1.65; }
        .legal-title { font-size: 32px; margin: 0 0 8px; font-weight: 600; letter-spacing: -0.02em; overflow-wrap: anywhere; }
        .legal-footer { border-top: 1px solid var(--line); padding: 20px 32px; color: var(--ink-3); font-size: 13px; overflow-wrap: anywhere; }
        @media (max-width: 600px) {
          .legal-header { padding: 16px; flex-direction: column; align-items: stretch; gap: 12px; }
          .legal-nav { justify-content: space-between; gap: 10px; overflow-x: auto; }
          .legal-main { padding: 24px 16px 72px; }
          .legal-title { font-size: clamp(26px, 9vw, 32px); line-height: 1.15; }
          .legal-footer { padding: 18px 16px; }
        }
      `}</style>
      <header
        className="legal-header"
      >
        <Link to="/" className="legal-brand">
          Almexa · Archon
        </Link>
        <nav className="legal-nav">
          <Link to="/privacy" style={navLink}>Privacidade</Link>
          <Link to="/terms" style={navLink}>Termos</Link>
          <Link to="/dpo" style={navLink}>DPO</Link>
          <Link to="/login" style={navLink}>Entrar</Link>
        </nav>
      </header>

      <main className="legal-main">
        <h1 className="legal-title">{title}</h1>
        {subtitle && <p style={{ color: "var(--ink-3)", margin: "0 0 8px" }}>{subtitle}</p>}
        <p style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 32 }}>
          Última atualização: {lastUpdated}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>{children}</div>
      </main>

      <footer className="legal-footer">
        © {new Date().getFullYear()} Almexa LTDA · CNPJ 48.803.245/0001-83 · Curitiba/PR ·{" "}
        Contato do encarregado:{" "}
        <a href="mailto:info@almexa.com.br" style={{ color: "var(--ink)" }}>info@almexa.com.br</a>
      </footer>
    </div>
  );
}

const navLink = { color: "var(--ink-2)", textDecoration: "none" } as const;

export function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section>
      <h2 style={{ fontSize: 20, margin: "0 0 12px", fontWeight: 600 }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </section>
  );
}
