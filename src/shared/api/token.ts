// Token storage abstraction. localStorage is the default; the indirect
// access lets tests swap to an in-memory shim and lets the auth flow
// flush state on logout via a single call.
const KEY = "archon.auth.token";
const TENANT_KEY = "archon.auth.tenant";
// CSRF token persisted in sessionStorage so page reloads don't lose it.
// In cross-subdomain cookie mode the archon_csrf cookie is not readable
// by JS (different subdomain), so sessionStorage is the only fallback.
const CSRF_KEY = "archon.auth.csrf";

let memoryToken: string | null = null;
let memoryTenant: string | null = null;
let memoryCsrf: string | null = null;

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  const st = safeStorage();
  if (st) return st.getItem(KEY);
  return memoryToken;
}

export function setToken(token: string | null) {
  const st = safeStorage();
  if (st) {
    if (token) st.setItem(KEY, token);
    else st.removeItem(KEY);
    return;
  }
  memoryToken = token;
}

export function getActiveTenantSlug(): string | null {
  const st = safeStorage();
  if (st) return st.getItem(TENANT_KEY);
  return memoryTenant;
}

export function setActiveTenantSlug(slug: string | null) {
  const st = safeStorage();
  if (st) {
    if (slug) st.setItem(TENANT_KEY, slug);
    else st.removeItem(TENANT_KEY);
    return;
  }
  memoryTenant = slug;
}

export function getCsrfToken(): string | null {
  if (memoryCsrf) return memoryCsrf;
  const st = safeStorage();
  return st ? st.getItem(CSRF_KEY) : null;
}

export function setCsrfToken(token: string | null) {
  memoryCsrf = token;
  const st = safeStorage();
  if (st) {
    if (token) st.setItem(CSRF_KEY, token);
    else st.removeItem(CSRF_KEY);
  }
}

export function clearAuth() {
  setToken(null);
  setActiveTenantSlug(null);
  setCsrfToken(null);
  memoryCsrf = null;
}
