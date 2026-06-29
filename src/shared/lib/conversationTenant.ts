export function resolveConversationTenantSlug(
  pageTenantSlug?: string | null,
  storedTenantSlug?: string | null,
): string | undefined {
  const pageTenant = (pageTenantSlug || "").trim();
  if (pageTenant) return pageTenant;
  const storedTenant = (storedTenantSlug || "").trim();
  return storedTenant || undefined;
}
