// LGPD data-subject endpoints (see archon/docs/lgpd/RIPD.md §10).
// Each function maps to /api/v1/me/* in the backend (handlers_me.go).

import { fetchClient, withApiBase } from "./client";
import { getToken } from "./token";

export type MeData = {
  user: {
    id: string;
    name: string;
    email: string;
    is_super: boolean;
    is_tenant_admin: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    purge_at: string | null;
  };
  tenant: {
    id: string;
    slug: string;
    name: string;
    document: string | null;
  };
  data_subject_rights: Record<string, string>;
  legal_basis: Record<string, string>;
};

export type ActivityEntry = {
  id: string;
  occurred_at: string;
  method: string;
  path: string;
  route?: string;
  target_type?: string;
  target_id?: string;
  action?: string;
  status_code: number;
  ip?: string;
  user_agent?: string;
};

export type DeleteResponse = {
  status: "scheduled_for_deletion";
  purge_at: string;
  grace_period: string;
  cancel_endpoint: string;
  message: string;
};

export function getMyData(): Promise<MeData> {
  return fetchClient<MeData>("/api/v1/me/data");
}

export function getMyActivity(limit = 100): Promise<ActivityEntry[]> {
  return fetchClient<ActivityEntry[]>(`/api/v1/me/activity?limit=${limit}`);
}

// downloadMyExport bypasses fetchClient because we want the browser to
// stream the JSON straight to disk via Content-Disposition. The token is
// added manually because we still need authentication.
export async function downloadMyExport(): Promise<void> {
  const token = getToken();
  const res = await fetch(withApiBase("/api/v1/me/data/export"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(`export failed: ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  a.download = match ? match[1] : `archon-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function requestAccountDeletion(): Promise<DeleteResponse> {
  return fetchClient<DeleteResponse>("/api/v1/me", { method: "DELETE" });
}

export function cancelAccountDeletion(): Promise<{ status: string }> {
  return fetchClient<{ status: string }>("/api/v1/me/restore", { method: "POST" });
}
