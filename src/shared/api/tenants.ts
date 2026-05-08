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

export const listTenants = () => fetchClient<Tenant[]>("/api/v1/tenants");

export const createTenant = (input: CreateTenantInput) =>
  fetchClient<Tenant>("/api/v1/tenants", {
    method: "POST",
    body: JSON.stringify(input),
  });
