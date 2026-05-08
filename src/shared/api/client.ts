import { clearAuth, getToken } from "./token";

export const API_BASE_URL = import.meta.env.VITE_ARCHON_API_URL || import.meta.env.VITE_API_URL || "http://localhost:8080";

export class ApiError extends Error {
  constructor(public status: number, public message: string, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

// Fired when fetchClient receives a 401 — listeners can clear in-memory
// react-query state and redirect to /login. The auth context wires its
// listener at boot.
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  onUnauthorized = fn;
}

export async function fetchClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuth();
    if (onUnauthorized) onUnauthorized();
  }

  if (!response.ok) {
    let errorData: { error?: string; code?: string };
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: response.statusText };
    }
    throw new ApiError(response.status, errorData.error || "An error occurred", errorData.code);
  }

  if (response.status === 204) {
    return {} as T;
  }
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text() as unknown as T;
}
