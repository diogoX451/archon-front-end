import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@app/auth-context";
import { ApiError } from "@shared/api/client";
import { signup, resendVerification } from "@shared/api/auth";
import { SIGNUP_ENABLED } from "@shared/signup-config";
import { LegalFooter } from "@shared/ui/LegalFooter";
import { ConsentCheckbox } from "@shared/ui/ConsentCheckbox";

const CONSENT_KEY = "archon-login-consent-v1";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type ResultState = { email: string; tenantName: string };

export function SignupPage() {
  const { user, loading } = useAuth();
  const [tenantName, setTenantName]   = useState("");
  const [tenantSlug, setTenantSlug]   = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [result, setResult]           = useState<ResultState | null>(null);
  const [resent, setResent]           = useState(false);
  const [consent, setConsent]         = useState<boolean>(() =>
    typeof window !== "undefined" && localStorage.getItem(CONSENT_KEY) === "1"
  );

  if (!SIGNUP_ENABLED) return <Navigate to="/login" replace />;
  if (loading) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Carregando…</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleTenantName = (value: string) => {
    setTenantName(value);
    if (!slugTouched) setTenantSlug(toSlug(value));
  };

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
      await signup({ tenant_name: tenantName, tenant_slug: tenantSlug, name, email, password });
      localStorage.setItem("archon:onboarding", "pending");
      setResult({ email, tenantName });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message || "Falha ao criar conta");
      else setError("Falha ao criar conta");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!result) return;
    setResent(false);
    try {
      await resendVerification(result.email);
      setResent(true);
    } catch {
      setError("Não foi possível reenviar o e-mail agora.");
    }
  };

  if (result) {
    return (
      <div style={pageStyle}>
        <div style={successCard}>
          <div style={successIcon}>✉️</div>
          <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>Confira seu e-mail</h1>
          <p style={{ color: "var(--ink-2)", margin: "0 0 20px", fontSize: 15, lineHeight: 1.6 }}>
            A conta de <strong>{result.tenantName}</strong> foi criada!<br />
            Enviamos um link de verificação para <strong>{result.email}</strong>.
          </p>
          <button type="button" className="btn primary" onClick={handleResend} style={{ width: "100%" }}>
            Reenviar e-mail
          </button>
          <Link to="/login" className="btn" style={{ display: "block", textAlign: "center", marginTop: 8 }}>
            Ir para login
          </Link>
          {resent && <p style={{ color: "var(--ok)", marginBottom: 0, fontSize: 13, textAlign: "center" }}>E-mail reenviado com sucesso.</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div aria-hidden style={bgGradient} />

      <Link to="/" style={logoStyle}>
        <span style={logoDot} />
        Almexa <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>· Archon</span>
      </Link>

      <form onSubmit={handleSubmit} style={cardStyle}>
        {/* Tab switcher */}
        <div style={tabBar}>
          <Link to="/login" style={{ ...tab, ...tabInactive }}>Entrar</Link>
          <span style={{ ...tab, ...tabActive }}>Criar conta</span>
        </div>

        <header style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, margin: 0, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Crie seu workspace
          </h1>
          <p style={{ color: "var(--ink-3)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            Pronto em minutos. Sem cartão de crédito agora.
          </p>
        </header>

        {/* Section: empresa */}
        <div style={sectionLabel}>Sobre sua empresa</div>
        <label style={labelStyle}>
          Nome da empresa
          <input
            required
            value={tenantName}
            onChange={(e) => handleTenantName(e.target.value)}
            style={inputStyle}
            placeholder="Acme Ltda"
            aria-label="Nome da empresa"
          />
        </label>

        {/* Public signup always provisions a free tenant; upgrades happen in
            an authenticated billing flow. The backend ignores any tier sent
            here, so we no longer offer a plan picker to anonymous visitors. */}

        {/* Section: você */}
        <div style={{ ...sectionLabel, marginTop: 4 }}>Seus dados</div>
        <label style={labelStyle}>
          Seu nome
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            placeholder="João Silva"
            aria-label="Seu nome"
          />
        </label>
        <label style={labelStyle}>
          E-mail
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="voce@empresa.com"
            autoComplete="username"
            aria-label="E-mail"
          />
        </label>
        <label style={labelStyle}>
          Senha <span style={{ color: "var(--ink-4)", fontWeight: 400 }}>(mínimo 8 caracteres)</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="••••••••"
            minLength={8}
            autoComplete="new-password"
            aria-label="Senha"
          />
        </label>

        {/* Hidden slug — auto-generated, user can override via URL if needed */}
        <input type="hidden" value={tenantSlug} />

        {error && (
          <div style={{
            fontSize: 13, color: "var(--err)",
            background: "color-mix(in oklab, var(--err) 10%, transparent)",
            border: "1px solid color-mix(in oklab, var(--err) 20%, transparent)",
            padding: "10px 12px", borderRadius: 8,
          }}>
            {error}
          </div>
        )}

        <ConsentCheckbox checked={consent} onChange={setConsent} />

        <button
          type="submit"
          disabled={submitting || !consent}
          style={submitBtn(submitting)}
        >
          {submitting ? "Criando conta…" : "Criar conta grátis →"}
        </button>

        <LegalFooter />
      </form>

      <p style={{ position: "relative", marginTop: 18, color: "var(--ink-3)", fontSize: 13 }}>
        <Link to="/" style={{ color: "var(--ink-3)", textDecoration: "none" }}>← Voltar ao site</Link>
      </p>
    </div>
  );
}

const pageStyle: CSSProperties = {
  position: "relative",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg)",
  padding: 24,
  overflow: "hidden",
};

const bgGradient: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(60% 50% at 85% 15%, var(--accent-soft) 0%, transparent 60%), radial-gradient(50% 40% at 10% 95%, color-mix(in oklab, var(--accent) 10%, transparent) 0%, transparent 70%)",
  pointerEvents: "none",
};

const logoStyle: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  color: "var(--ink)",
  textDecoration: "none",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  marginBottom: 24,
};

const logoDot: CSSProperties = {
  width: 10, height: 10,
  borderRadius: 999,
  background: "var(--accent)",
  display: "inline-block",
  boxShadow: "0 0 0 3px var(--accent-soft)",
};

const cardStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 420,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  boxShadow: "var(--shadow-3)",
  borderRadius: 16,
  padding: 32,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const successCard: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 420,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  boxShadow: "var(--shadow-3)",
  borderRadius: 16,
  padding: 32,
  display: "flex",
  flexDirection: "column",
  gap: 0,
  textAlign: "center",
};

const successIcon: CSSProperties = {
  fontSize: 40,
  marginBottom: 16,
};

const tabBar: CSSProperties = {
  display: "flex",
  background: "var(--surface-2)",
  borderRadius: 10,
  padding: 4,
  gap: 4,
  marginBottom: 4,
};

const tab: CSSProperties = {
  flex: 1,
  textAlign: "center",
  padding: "8px 0",
  borderRadius: 7,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  transition: "background 0.15s, color 0.15s",
};

const tabActive: CSSProperties = {
  background: "var(--surface)",
  color: "var(--ink)",
  boxShadow: "var(--shadow-1)",
};

const tabInactive: CSSProperties = {
  background: "transparent",
  color: "var(--ink-3)",
};

const sectionLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--ink-3)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: -6,
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  color: "var(--ink-2)",
  fontWeight: 500,
};

const inputStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 10,
  background: "var(--surface-2)",
  color: "var(--ink)",
  fontSize: 15,
  padding: "11px 14px",
  outline: "none",
  transition: "border-color 0.2s ease",
  width: "100%",
  boxSizing: "border-box",
};

const submitBtn = (submitting: boolean): CSSProperties => ({
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
});
