// Server-only settings. Never import this from a Client Component.

/** The backend's address, such as https://api.ifnotgod.com, without the /api/v1 prefix. */
export function apiBaseUrl(): string | null {
  const value = process.env.DASHBOARD_API_URL;
  return value ? value.replace(/\/+$/, "") : null;
}

/** The dashboard's own key for the backend. Every request must send it. */
export function apiAppKey(): string | null {
  return process.env.DASHBOARD_APP_KEY || null;
}

export const API_PREFIX = "/api/v1";
export const API_TIMEOUT_MS = 10_000;
