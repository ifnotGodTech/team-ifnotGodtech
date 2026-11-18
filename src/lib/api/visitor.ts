import { headers } from "next/headers";

/**
 * The visitor's own address, for the backend's rate limits and lockouts. On Vercel, the first
 * address in x-forwarded-for is the visitor's, set by Vercel itself. Null outside a request.
 */
export async function visitorIp(): Promise<string | null> {
  try {
    const list = await headers();
    return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || null;
  } catch {
    return null;
  }
}
