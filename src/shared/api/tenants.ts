import { fetchClient } from "./client";

export type PlanTier = "free" | "starter" | "growth" | "enterprise";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  document?: string;
  active: boolean;
  plan?: PlanTier;
  plan_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantInput {
  slug: string;
  name: string;
  document?: string;
}

export interface UpdateTenantInput {
  name?: string;
  document?: string;
}

export interface UpdateTenantStatusInput {
  active: boolean;
}

export interface UpdateTenantPlanInput {
  plan: PlanTier;
  plan_expires_at?: string | null;
}

export const listTenants = () => fetchClient<Tenant[]>("/api/v1/tenants");

export const createTenant = (input: CreateTenantInput) =>
  fetchClient<Tenant>("/api/v1/tenants", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateTenant = (id: string, input: UpdateTenantInput) =>
  fetchClient<Tenant>(`/api/v1/tenants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const updateTenantStatus = (id: string, input: UpdateTenantStatusInput) =>
  fetchClient<Tenant>(`/api/v1/tenants/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const updateTenantPlan = (id: string, input: UpdateTenantPlanInput) =>
  fetchClient<{ id: string; plan: PlanTier; plan_expires_at?: string | null }>(
    `/api/v1/tenants/${id}/plan`,
    { method: "PATCH", body: JSON.stringify(input) }
  );
