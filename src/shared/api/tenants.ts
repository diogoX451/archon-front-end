import { fetchClient } from "./client";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  document?: string;
  active: boolean;
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
