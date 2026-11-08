// Server-only settings. Never import this from a Client Component.

export function apiBaseUrl(): string | null {
  const value = process.env.DASHBOARD_API_URL;
  return value ? value.replace(/\/+$/, "") : null;
}

export const API_TIMEOUT_MS = 10_000;
