import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin, me as apiMe, type AuthUser, type MeResponse } from "@shared/api/auth";
import { setUnauthorizedHandler } from "@shared/api/client";
import { clearAuth, getActiveTenantSlug, getToken, setActiveTenantSlug, setToken } from "@shared/api/token";

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
  const [loading, setLoading] = useState<boolean>(() => !!getToken());
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // Hydrate session from a still-valid token on first paint.
  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
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
    setToken(out.token);
    setUser(out.user);
    const slug = out.user.tenant_slug;
    setActiveTenantSlug(slug);
    setActiveTenant(slug);
    const m = await apiMe();
    setPermissions(new Set(m.permissions || []));
  }, []);

  const logout = useCallback(() => {
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
