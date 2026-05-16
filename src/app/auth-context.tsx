import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin, logout as apiLogout, me as apiMe, type AuthUser, type MeResponse } from "@shared/api/auth";
import { AUTH_MODE, setUnauthorizedHandler } from "@shared/api/client";
import { clearAuth, getActiveTenantSlug, getToken, setActiveTenantSlug, setCsrfToken, setToken } from "@shared/api/token";

export interface AuthContextValue {
  user: AuthUser | null;
  permissions: Set<string>;
  isSuper: boolean;
  isTenantAdmin: boolean;
  activeTenantSlug: string;
  setActiveTenantSlug: (slug: string) => void;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (key: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [activeTenant, setActiveTenant] = useState<string>(() => getActiveTenantSlug() || "");
  // In cookie mode we don't know whether a session is present until /auth/me
  // answers — the httpOnly cookie is invisible to JS. Always hit /auth/me on
  // boot. In bearer mode we still gate on getToken() to avoid pointless 401s.
  const [loading, setLoading] = useState<boolean>(() => AUTH_MODE === "cookie" || !!getToken());
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // Hydrate session on first paint. Cookie mode: hit /auth/me unconditionally
  // — the httpOnly cookie is invisible to JS, so the server is the source of
  // truth. Bearer mode: skip the round trip when no token is stashed locally.
  useEffect(() => {
    let cancelled = false;
    if (AUTH_MODE !== "cookie" && !getToken()) {
      setLoading(false);
      return;
    }
    apiMe()
      .then((m: MeResponse) => {
        if (cancelled) return;
        setUser({
          id: m.user_id,
          tenant_id: m.tenant_id,
          tenant_slug: m.tenant_slug,
          name: m.name,
          email: m.email,
          is_super: m.is_super,
          is_tenant_admin: m.is_tenant_admin,
          is_active: true,
        });
        setPermissions(new Set(m.permissions || []));
        if (!getActiveTenantSlug()) {
          setActiveTenantSlug(m.tenant_slug);
          setActiveTenant(m.tenant_slug);
        }
      })
      .catch(() => {
        // Token rejected; the 401 handler in client.ts already cleared
        // it. Just unblock the loading gate so the LoginPage renders.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Wire the global 401 handler so any failing API call kicks the user
  // out and reroutes to /login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setPermissions(new Set());
      navigateRef.current("/login", { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const out = await apiLogin(email, password);
    // In bearer mode the JWT lives in sessionStorage and is sent as
    // Authorization: Bearer. In cookie mode the server already set
    // archon_session (httpOnly) + archon_csrf (readable) — JS must not
    // persist the token to keep it XSS-resistant.
    if (AUTH_MODE !== "cookie") {
      setToken(out.token);
    }
    // Always persist csrf_token regardless of AUTH_MODE.
    // archon_csrf cookie is set on api.almexa.com.br — JS running on
    // archon.almexa.com.br cannot read cross-subdomain cookies, so the
    // JSON body token is the only reliable source for the X-CSRF-Token header.
    if (out.csrf_token) setCsrfToken(out.csrf_token);
    setUser(out.user);
    const slug = out.user.tenant_slug;
    setActiveTenantSlug(slug);
    setActiveTenant(slug);
    const m = await apiMe();
    setPermissions(new Set(m.permissions || []));
  }, []);

  const logout = useCallback(() => {
    // Cookie mode: ask the server to clear the cookies first; ignore
    // errors so we never block the local cleanup.
    if (AUTH_MODE === "cookie") {
      void apiLogout().catch(() => {});
    }
    clearAuth();
    setUser(null);
    setPermissions(new Set());
    setActiveTenant("");
    navigateRef.current("/login", { replace: true });
  }, []);

  const setActiveTenantSlugCb = useCallback((slug: string) => {
    setActiveTenantSlug(slug);
    setActiveTenant(slug);
  }, []);

  const hasPermission = useCallback(
    (key: string) => {
      if (!user) return false;
      if (user.is_super) return true;
      return permissions.has(key);
    },
    [user, permissions],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      permissions,
      isSuper: !!user?.is_super,
      isTenantAdmin: !!user?.is_tenant_admin,
      activeTenantSlug: activeTenant,
      setActiveTenantSlug: setActiveTenantSlugCb,
      loading,
      login,
      logout,
      hasPermission,
    }),
    [user, permissions, activeTenant, loading, login, logout, setActiveTenantSlugCb, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
