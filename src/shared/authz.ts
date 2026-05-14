import type { AuthContextValue } from "@app/auth-context";

export function canAny(auth: Pick<AuthContextValue, "isSuper" | "hasPermission">, keys: string[]): boolean {
  if (auth.isSuper) return true;
  for (const k of keys) {
    if (auth.hasPermission(k)) return true;
  }
  return false;
}

export function canAll(auth: Pick<AuthContextValue, "isSuper" | "hasPermission">, keys: string[]): boolean {
  if (auth.isSuper) return true;
  for (const k of keys) {
    if (!auth.hasPermission(k)) return false;
  }
  return true;
}
