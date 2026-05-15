import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@app/auth-context";
import { ApiError } from "@shared/api/client";
import { ConsentCheckbox } from "@shared/ui/ConsentCheckbox";
import { LegalFooter } from "@shared/ui/LegalFooter";

const CONSENT_KEY = "archon-login-consent-v1";

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin@archon.local");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Consent persists across logins on the same device. Cleared if the
  // user revokes it via /account/privacy in a future iteration.
  const [consent, setConsent] = useState<boolean>(() =>
    typeof window !== "undefined" && localStorage.getItem(CONSENT_KEY) === "1"
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <span style={{ color: "var(--ink-3)" }}>Carregando…</span>
      </div>
    );
  }
  if (user) {
    const redirectTo = (location.state as { from?: string } | null)?.from || "/";
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!consent) {
      setError("Aceite a Política de Privacidade e os Termos de Uso para continuar.");
      return;
    }
    localStorage.setItem(CONSENT_KEY, "1");
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const redirectTo = (location.state as { from?: string } | null)?.from || "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("Email ou senha incorretos");
        } else {
          setError(err.message || "Falha no login");
        }
      } else {
        setError("Falha no login");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top, oklch(0.25 0.05 250), var(--bg) 60%)",
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "color-mix(in oklab, var(--surface) 60%, transparent)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid color-mix(in oklab, var(--line) 50%, transparent)",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px inset rgba(255, 255, 255, 0.05)",
          borderRadius: 16,
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, oklch(0.6 0.15 250), oklch(0.4 0.12 280))",
            display: "grid",
            placeItems: "center",
            marginBottom: 8,
            boxShadow: "0 8px 16px rgba(0,0,0,0.2)"
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, margin: 0, fontWeight: 600, letterSpacing: "-0.02em" }}>Archon</h1>
          <p style={{ color: "var(--ink-3)", fontSize: 14, margin: 0, textAlign: "center", lineHeight: 1.4 }}>
            Faça login para acessar o painel de controle e gerenciar seus agentes.
          </p>
        </header>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--ink-2)", fontWeight: 500 }}>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            placeholder="admin@archon.local"
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--ink-2)", fontWeight: 500 }}>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            required
            style={inputStyle}
          />
        </label>

        {error && (
          <div
            style={{
              fontSize: 13,
              color: "var(--err)",
              background: "color-mix(in oklab, var(--err) 10%, transparent)",
              border: "1px solid color-mix(in oklab, var(--err) 20%, transparent)",
              padding: "10px 12px",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}

        <ConsentCheckbox checked={consent} onChange={setConsent} />

        <button
          type="submit"
          disabled={submitting || !consent}
          style={{ 
            marginTop: 8,
            background: submitting ? "var(--ink-3)" : "var(--ink)",
            color: "var(--bg)",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 14,
            fontWeight: 500,
            cursor: submitting ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            boxShadow: submitting ? "none" : "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {submitting ? "Autenticando…" : "Entrar no sistema"}
        </button>

        <LegalFooter />
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "color-mix(in oklab, var(--bg) 50%, transparent)",
  color: "var(--ink)",
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  padding: "10px 12px",
  outline: "none",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};
