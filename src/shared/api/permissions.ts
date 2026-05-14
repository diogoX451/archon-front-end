import { fetchClient } from "./client";

// Permission mirrors auth.Permission on the backend. Used by both the
// super-admin template editor (full catalogue) and the tenant role
// editor (filtered by the allowed-permissions ceiling).
export interface Permission {
  id: string;
  key: string;
  resource: string;
  category: string;
  action: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const listPermissions = () => fetchClient<Permission[]>("/api/v1/permissions");
