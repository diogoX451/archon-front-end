import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@app/auth-context";
import { forgotPassword } from "@shared/api/auth";

export function ForgotPasswordPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (loading) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Carregando…</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={pageStyle}>
      <form onSubmit={onSubmit} style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Recuperar senha</h1>
        <p style={{ color: "var(--ink-3)", marginTop: 0 }}>
          Digite seu e-mail. Se existir uma conta, enviaremos o link de redefinição.
        </p>
        <label>
          E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </label>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? "Enviando..." : "Enviar link"}
        </button>
        {done && <div style={{ color: "var(--ok)", fontSize: 13 }}>Se o e-mail existir, você receberá as instruções.</div>}
        <Link to="/login" style={{ fontSize: 13 }}>Voltar ao login</Link>
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
  maxWidth: 440,
  background: "var(--surface)",
  border: "1px solid var(--line)",
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
