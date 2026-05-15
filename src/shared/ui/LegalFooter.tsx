import { Link } from "react-router-dom";

// LegalFooter is the small "links" footer used on unauthenticated pages
// (login, signup). Inside the app the same links live in
// /account/privacy.
export function LegalFooter() {
  return (
    <footer
      style={{
        marginTop: 20,
        paddingTop: 16,
        borderTop: "1px solid color-mix(in oklab, var(--line) 50%, transparent)",
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "center",
        fontSize: 12,
        color: "var(--ink-3)",
      }}
    >
      <Link to="/privacy" style={linkStyle}>Privacidade</Link>
      <span aria-hidden="true">·</span>
      <Link to="/terms" style={linkStyle}>Termos</Link>
      <span aria-hidden="true">·</span>
      <Link to="/dpo" style={linkStyle}>Encarregado</Link>
    </footer>
  );
}

const linkStyle = { color: "var(--ink-2)", textDecoration: "none" } as const;
