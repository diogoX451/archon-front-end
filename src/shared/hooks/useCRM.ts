import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listContacts, getContact, createContact, updateContact, deleteContact, getCRMStats,
  listCards, getCard, createCard, updateCard, deleteCard, getCardAnalytics,
  type Contact, type CreateContactInput, type UpdateContactInput,
  type BusinessCard, type CreateCardInput, type UpdateCardInput, type CRMStats,
} from "@shared/api/crm";

// ── Query keys ────────────────────────────────────────────────────────────

export const crmKeys = {
  contacts: {
    all: ["crm", "contacts"] as const,
    list: (params?: object) => [...crmKeys.contacts.all, "list", params ?? {}] as const,
    detail: (id: string) => [...crmKeys.contacts.all, "detail", id] as const,
    stats: () => [...crmKeys.contacts.all, "stats"] as const,
  },
  cards: {
    all: ["crm", "cards"] as const,
    list: () => [...crmKeys.cards.all, "list"] as const,
    detail: (id: string) => [...crmKeys.cards.all, "detail", id] as const,
    analytics: (id: string) => [...crmKeys.cards.all, "analytics", id] as const,
  },
};

// ── Contact hooks ─────────────────────────────────────────────────────────

export const useContacts = (params?: { status?: string; q?: string }) => {
  return useQuery<Contact[]>({
    queryKey: crmKeys.contacts.list(params),
    queryFn: () => listContacts(params as Parameters<typeof listContacts>[0]),
  });
};

export const useContact = (id: string) => {
  return useQuery<Contact>({
    queryKey: crmKeys.contacts.detail(id),
    queryFn: () => getContact(id),
    enabled: !!id,
  });
};

export const useCRMStats = () => {
  return useQuery<CRMStats>({
    queryKey: crmKeys.contacts.stats(),
    queryFn: getCRMStats,
  });
};

export const useCreateContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContactInput) => createContact(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.contacts.all }),
  });
};

export const useUpdateContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateContactInput }) =>
      updateContact(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.contacts.all }),
  });
};

export const useDeleteContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.contacts.all }),
  });
};

// ── Card hooks ────────────────────────────────────────────────────────────

export const useCards = () => {
  return useQuery<BusinessCard[]>({
    queryKey: crmKeys.cards.list(),
    queryFn: listCards,
  });
};

export const useCard = (id: string) => {
  return useQuery<BusinessCard>({
    queryKey: crmKeys.cards.detail(id),
    queryFn: () => getCard(id),
    enabled: !!id,
  });
};

export const useCardAnalytics = (id: string) => {
  return useQuery({
    queryKey: crmKeys.cards.analytics(id),
    queryFn: () => getCardAnalytics(id),
    enabled: !!id,
  });
};

export const useCreateCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCardInput) => createCard(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.cards.all }),
  });
};

export const useUpdateCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCardInput }) =>
      updateCard(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.cards.all }),
  });
};

export const useDeleteCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.cards.all }),
  });
};
