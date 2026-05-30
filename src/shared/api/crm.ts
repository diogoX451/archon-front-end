import { fetchClient } from "./client";

// ── Types ─────────────────────────────────────────────────────────────────

export type ContactStatus = "novo" | "em_contato" | "cliente" | "arquivado";
export type ContactSource = "manual" | "agenda" | "cartao";

export interface Contact {
  id: string;
  tenant_id: string;
  name: string;
  role?: string;
  company?: string;
  email?: string;
  phone?: string;
  site?: string;
  status: ContactStatus;
  notes?: string;
  source: ContactSource;
  created_at: string;
  updated_at: string;
}

export interface CreateContactInput {
  name: string;
  role?: string;
  company?: string;
  email?: string;
  phone?: string;
  site?: string;
  notes?: string;
  source?: ContactSource;
}

export interface UpdateContactInput {
  name?: string;
  role?: string;
  company?: string;
  email?: string;
  phone?: string;
  site?: string;
  status?: ContactStatus;
  notes?: string;
}

export interface CRMStats {
  total: number;
  novo: number;
  em_contato: number;
  cliente: number;
  arquivado: number;
}

export type CardTheme = "onyx" | "bone" | "forest" | "slate" | "clay" | "chalk" | "dusk" | "custom";
export type CardLayout = "classic" | "centered" | "minimal";
export type CardFont = "bricolage" | "playfair" | "cormorant" | "syne" | "mono";

export interface CardColors {
  bg: string;
  text: string;
  accent: string;
  border: string;
}

export interface BusinessCard {
  id: string;
  tenant_id: string;
  owner_id: string;
  name: string;
  role?: string;
  company?: string;
  email?: string;
  phone?: string;
  site?: string;
  theme: CardTheme;
  layout: CardLayout;
  font: CardFont;
  colors?: CardColors;
  slug: string;
  active: boolean;
  public_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCardInput {
  name: string;
  role?: string;
  company?: string;
  email?: string;
  phone?: string;
  site?: string;
  theme?: CardTheme;
  layout?: CardLayout;
  font?: CardFont;
  colors?: CardColors;
}

export interface UpdateCardInput {
  name?: string;
  role?: string;
  company?: string;
  email?: string;
  phone?: string;
  site?: string;
  theme?: CardTheme;
  layout?: CardLayout;
  font?: CardFont;
  colors?: CardColors;
  active?: boolean;
}

export interface DayCount {
  day: string;
  views: number;
}

export interface CardAnalytics {
  total_views: number;
  unique_visitors: number;
  views_by_day: DayCount[];
}

// ── Contact API ───────────────────────────────────────────────────────────

export const listContacts = (params?: { status?: ContactStatus; q?: string; limit?: number; offset?: number }) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.q) qs.set("q", params.q);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return fetchClient<Contact[]>(`/api/v1/crm/contacts${query ? `?${query}` : ""}`);
};

export const getContact = (id: string) =>
  fetchClient<Contact>(`/api/v1/crm/contacts/${id}`);

export const createContact = (input: CreateContactInput) =>
  fetchClient<Contact>("/api/v1/crm/contacts", { method: "POST", body: JSON.stringify(input) });

export const updateContact = (id: string, input: UpdateContactInput) =>
  fetchClient<Contact>(`/api/v1/crm/contacts/${id}`, { method: "PUT", body: JSON.stringify(input) });

export const deleteContact = (id: string) =>
  fetchClient<void>(`/api/v1/crm/contacts/${id}`, { method: "DELETE" });

export const getCRMStats = () =>
  fetchClient<CRMStats>("/api/v1/crm/contacts/stats");

// ── Business Card API ─────────────────────────────────────────────────────

export const listCards = () =>
  fetchClient<BusinessCard[]>("/api/v1/crm/cards");

export const getCard = (id: string) =>
  fetchClient<BusinessCard>(`/api/v1/crm/cards/${id}`);

export const createCard = (input: CreateCardInput) =>
  fetchClient<BusinessCard>("/api/v1/crm/cards", { method: "POST", body: JSON.stringify(input) });

export const updateCard = (id: string, input: UpdateCardInput) =>
  fetchClient<BusinessCard>(`/api/v1/crm/cards/${id}`, { method: "PUT", body: JSON.stringify(input) });

export const deleteCard = (id: string) =>
  fetchClient<void>(`/api/v1/crm/cards/${id}`, { method: "DELETE" });

export const getCardAnalytics = (id: string) =>
  fetchClient<CardAnalytics>(`/api/v1/crm/cards/${id}/analytics`);

export const getPublicCard = (slug: string) =>
  fetch(`/c/${slug}`).then(r => { if (!r.ok) throw new Error("not found"); return r.json() as Promise<BusinessCard>; });
