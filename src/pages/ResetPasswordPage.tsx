import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@app/auth-context";
import { ApiError } from "@shared/api/client";
import { resetPassword } from "@shared/api/auth";

export function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (loading) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Carregando…</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError("Token ausente.");
      return;
    }
    if (password.length < 8) {
      setError("A senha precisa ter ao menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message || "Não foi possível redefinir a senha.");
      else setError("Não foi possível redefinir a senha.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={pageStyle}>
      <form onSubmit={onSubmit} style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Nova senha</h1>
        {!done ? (
          <>
            <label>
              Nova senha
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            </label>
            <label>
              Confirmar senha
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} />
            </label>
            {error && <div style={{ color: "var(--err)", fontSize: 13 }}>{error}</div>}
            <button type="submit" className="btn primary" disabled={submitting}>{submitting ? "Salvando..." : "Atualizar senha"}</button>
          </>
        ) : (
          <div style={{ color: "var(--ok)", fontSize: 14 }}>Senha atualizada com sucesso.</div>
        )}
        <Link to="/login" style={{ fontSize: 13 }}>Ir para login</Link>
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
