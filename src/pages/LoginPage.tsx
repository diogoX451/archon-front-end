import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
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
    const redirectTo = (location.state as { from?: string } | null)?.from || "/dashboard";
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
      const redirectTo = (location.state as { from?: string } | null)?.from || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) setError("Email ou senha incorretos");
        else setError(err.message || "Falha no login");
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
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 24,
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(60% 50% at 85% 15%, var(--accent-soft) 0%, transparent 60%), radial-gradient(50% 40% at 10% 95%, color-mix(in oklab, var(--accent) 10%, transparent) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <Link
        to="/"
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          color: "var(--ink)",
          textDecoration: "none",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          marginBottom: 28,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: "var(--accent)",
            display: "inline-block",
            boxShadow: "0 0 0 3px var(--accent-soft)",
          }}
        />
        Almexa <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>· Archon</span>
      </Link>

      <form
        onSubmit={handleSubmit}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 400,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow-3)",
          borderRadius: 16,
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, margin: 0, fontWeight: 600, letterSpacing: "-0.02em" }}>
            Bem-vindo de volta
          </h1>
          <p style={{ color: "var(--ink-3)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            Acesse o painel e acompanhe seu atendimento.
          </p>
        </header>

        <label style={labelStyle}>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            placeholder="voce@empresa.com"
            required
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
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
              gap: 8,
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
            marginTop: 4,
            background: submitting ? "var(--ink-3)" : "var(--ink)",
            color: "var(--surface)",
            border: "none",
            borderRadius: 999,
            padding: "12px 18px",
            fontSize: 15,
            fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
            transition: "transform 0.15s ease, box-shadow 0.2s ease",
            boxShadow: submitting ? "none" : "var(--shadow-2)",
          }}
        >
          {submitting ? "Autenticando…" : "Entrar →"}
        </button>

        <LegalFooter />
      </form>

      <p
        style={{
          position: "relative",
          marginTop: 22,
          color: "var(--ink-3)",
          fontSize: 13,
        }}
      >
        Ainda não conhece o Archon?{" "}
        <Link to="/" style={{ color: "var(--accent-ink)", fontWeight: 500, textDecoration: "none" }}>
          Ver a plataforma →
        </Link>
      </p>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  color: "var(--ink-2)",
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 10,
  background: "var(--surface-2)",
  color: "var(--ink)",
  fontSize: 15,
  padding: "11px 14px",
  outline: "none",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};
