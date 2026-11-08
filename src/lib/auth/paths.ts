/** Only paths in this app, so a link can't send someone to another website after logging in. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value.startsWith("/login")) return "/";
  return value;
}

export function loginPath(next: string, reason?: "expired" | "signed-out"): string {
  const params = new URLSearchParams();
  if (next !== "/") params.set("next", next);
  if (reason) params.set("reason", reason);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}
