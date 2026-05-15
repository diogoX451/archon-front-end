import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "archon-cookie-consent-v1";

// CookieBanner is a minimal one-time banner. We don't run any
// third-party tracker today, so the only purpose is transparency: tell
// the visitor we use strictly necessary cookies (session, CSRF, theme)
// and require an acknowledgement. If we ever add analytics, this banner
// must grow into a granular consent panel.
export function CookieBanner() {
  const [accepted, setAccepted] = useState<boolean>(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    setAccepted(stored === "accepted");
  }, []);

  if (accepted) return null;

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setAccepted(true);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de uso de cookies"
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 560,
        margin: "0 auto",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "16px 18px",
        boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        zIndex: 1000,
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <p style={{ margin: 0, color: "var(--ink-2)" }}>
        Usamos apenas cookies estritamente necessários para autenticação e preferências da
        interface. Não utilizamos rastreadores ou publicidade.{" "}
        <Link to="/privacy" style={{ color: "var(--ink)" }}>Política de Privacidade</Link>.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          onClick={accept}
          style={{
            background: "var(--ink)",
            color: "var(--bg)",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
