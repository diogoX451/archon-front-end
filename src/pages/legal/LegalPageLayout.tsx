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
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      <header
        style={{
          borderBottom: "1px solid var(--line)",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link to="/" style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 600 }}>
          Almexa · Archon
        </Link>
        <nav style={{ display: "flex", gap: 16, fontSize: 14 }}>
          <Link to="/privacy" style={navLink}>Privacidade</Link>
          <Link to="/terms" style={navLink}>Termos</Link>
          <Link to="/dpo" style={navLink}>DPO</Link>
          <Link to="/login" style={navLink}>Entrar</Link>
        </nav>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 96px", fontSize: 15, lineHeight: 1.65 }}>
        <h1 style={{ fontSize: 32, margin: "0 0 8px", fontWeight: 600, letterSpacing: "-0.02em" }}>{title}</h1>
        {subtitle && <p style={{ color: "var(--ink-3)", margin: "0 0 8px" }}>{subtitle}</p>}
        <p style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 32 }}>
          Última atualização: {lastUpdated}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>{children}</div>
      </main>

      <footer style={{ borderTop: "1px solid var(--line)", padding: "20px 32px", color: "var(--ink-3)", fontSize: 13 }}>
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
