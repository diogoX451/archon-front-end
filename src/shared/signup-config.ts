export const SIGNUP_ENABLED = import.meta.env.VITE_ARCHON_SIGNUP_ENABLED === "true";

export const SIGNUP_TIERS = [
  { key: "free", label: "Free", price: "R$ 0/mês" },
  { key: "starter", label: "Starter", price: "R$ 297/mês" },
  { key: "growth", label: "Growth", price: "R$ 797/mês" },
  { key: "enterprise", label: "Enterprise", price: "R$ 2.500+/mês" },
] as const;

export type SignupTier = (typeof SIGNUP_TIERS)[number]["key"];
