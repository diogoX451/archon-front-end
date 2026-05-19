import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { verifyEmail } from "@shared/api/auth";
import { SIGNUP_ENABLED } from "@shared/signup-config";

type State = "loading" | "ok" | "error";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    const token = params.get("token") || "";
    if (!token) {
      setState("error");
      return;
    }
    verifyEmail(token)
      .then(() => setState("ok"))
      .catch(() => setState("error"));
  }, [params]);

  if (!SIGNUP_ENABLED) return <Navigate to="/login" replace />;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 520, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 24 }}>
        {state === "loading" && <p style={{ margin: 0 }}>Validando seu e-mail...</p>}
        {state === "ok" && (
          <>
            <h1 style={{ marginTop: 0 }}>E-mail confirmado</h1>
            <p style={{ color: "var(--ink-2)" }}>Sua conta está ativa. Você já pode entrar no Archon.</p>
            <Link to="/login" className="btn primary">Ir para login</Link>
          </>
        )}
        {state === "error" && (
          <>
            <h1 style={{ marginTop: 0 }}>Link inválido ou expirado</h1>
            <p style={{ color: "var(--ink-2)" }}>Peça um novo e-mail de verificação na tela de cadastro.</p>
            <Link to="/signup" className="btn">Voltar ao cadastro</Link>
          </>
        )}
      </div>
    </div>
  );
}
