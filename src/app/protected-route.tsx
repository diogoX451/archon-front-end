import { Navigate, useLocation } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { useAuth } from "./auth-context";

// ProtectedRoute is the gate that wraps every authenticated subtree.
// While the auth context is hydrating from a stored token (loading=true)
// it renders a placeholder; once hydrated, it either passes children
// through or redirects to /login carrying the original path so the
// LoginPage can bounce back after success.
export function ProtectedRoute({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <span style={{ color: "var(--ink-3)" }}>Carregando…</span>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }
  return <>{children}</>;
}
