import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@app/auth-context";
import { ApiError } from "@shared/api/client";
import { signup, resendVerification } from "@shared/api/auth";
import { SIGNUP_ENABLED, SIGNUP_TIERS, type SignupTier } from "@shared/signup-config";

type ResultState = {
  email: string;
  tenantName: string;
};

export function SignupPage() {
  const { user, loading } = useAuth();
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [document, setDocument] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tier, setTier] = useState<SignupTier>("starter");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [resent, setResent] = useState(false);

  if (!SIGNUP_ENABLED) return <Navigate to="/login" replace />;
  if (loading) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Carregando…</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({
        tenant_name: tenantName,
        tenant_slug: tenantSlug,
        document: document || undefined,
        tier,
        name,
        email,
        password,
      });
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
        <div style={cardStyle}>
          <h1 style={{ marginTop: 0 }}>Confira seu e-mail</h1>
          <p style={{ color: "var(--ink-2)" }}>
            A conta de <strong>{result.tenantName}</strong> foi criada. Enviamos um link de verificação para <strong>{result.email}</strong>.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn primary" onClick={handleResend}>Reenviar e-mail</button>
            <Link to="/login" className="btn">Ir para login</Link>
          </div>
          {resent && <p style={{ color: "var(--ok)", marginBottom: 0 }}>E-mail reenviado com sucesso.</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <form onSubmit={handleSubmit} style={cardStyle}>
        <h1 style={{ marginTop: 0, marginBottom: 6 }}>Criar conta</h1>
        <p style={{ marginTop: 0, color: "var(--ink-3)", fontSize: 14 }}>Defina seu workspace inicial no Archon.</p>

        <label>Nome da empresa<input required value={tenantName} onChange={(e) => setTenantName(e.target.value)} style={inputStyle} aria-label="Nome da empresa" /></label>
        <label>Slug da empresa<input required value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} style={inputStyle} placeholder="acme" aria-label="Slug da empresa" /></label>
        <label>Documento (opcional)<input value={document} onChange={(e) => setDocument(e.target.value)} style={inputStyle} aria-label="Documento (opcional)" /></label>

        <label>Plano
          <select value={tier} onChange={(e) => setTier(e.target.value as SignupTier)} style={inputStyle}>
            {SIGNUP_TIERS.map((t) => <option key={t.key} value={t.key}>{t.label} · {t.price}</option>)}
          </select>
        </label>

        <label>Seu nome<input required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} aria-label="Seu nome" /></label>
        <label>E-mail<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} aria-label="E-mail" /></label>
        <label>Senha<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} minLength={8} aria-label="Senha" /></label>

        {error && <div style={{ color: "var(--err)", fontSize: 13 }}>{error}</div>}

        <button type="submit" className="btn primary" disabled={submitting}>{submitting ? "Criando..." : "Criar conta"}</button>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 0 }}>Já tem conta? <Link to="/login">Entrar</Link></p>
      </form>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "var(--bg)",
  padding: 20,
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  boxShadow: "var(--shadow-2)",
  borderRadius: 14,
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const inputStyle: CSSProperties = {
  width: "100%",
  marginTop: 6,
  border: "1px solid var(--line)",
  background: "var(--surface-2)",
  borderRadius: 8,
  padding: "10px 12px",
};
