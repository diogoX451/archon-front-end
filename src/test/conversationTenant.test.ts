import { describe, expect, it } from "vitest";

import { resolveConversationTenantSlug } from "../shared/lib/conversationTenant";

describe("resolveConversationTenantSlug", () => {
  it("prefers the explicit tenant from the page context", () => {
    expect(resolveConversationTenantSlug("bpms", "global")).toBe("bpms");
  });

  it("falls back to the stored active tenant when the page tenant is empty", () => {
    expect(resolveConversationTenantSlug("   ", "bpms")).toBe("bpms");
  });

  it("returns undefined when neither source has a tenant", () => {
    expect(resolveConversationTenantSlug("", "   ")).toBeUndefined();
  });
});
