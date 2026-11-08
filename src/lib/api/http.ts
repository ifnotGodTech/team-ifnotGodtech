import type { z } from "zod";
import { API_TIMEOUT_MS, apiBaseUrl } from "./config";
import { apiError, codeForStatus, type ApiResult } from "./errors";

// The raw HTTP client. Only the functions in src/lib/api use it; screens call those instead.

type RequestOptions<T> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Checks the response's shape, so a changed or broken backend can't put bad data on screen. */
  schema: z.ZodType<T>;
  /** Extra headers, such as the staff session cookie from phase 2. */
  headers?: Record<string, string>;
};

/** Backend error bodies may carry a message and per-field messages. Anything else is ignored. */
function readErrorBody(body: unknown): { message?: string; fieldErrors?: Record<string, string> } {
  if (typeof body !== "object" || body === null) return {};
  const { message, errors } = body as { message?: unknown; errors?: unknown };
  const fieldErrors: Record<string, string> = {};
  if (typeof errors === "object" && errors !== null) {
    for (const [field, value] of Object.entries(errors)) {
      const text = Array.isArray(value) ? value[0] : value;
      if (typeof text === "string") fieldErrors[field] = text;
    }
  }
  return { message: typeof message === "string" ? message : undefined, fieldErrors };
}

export async function apiRequest<T>(path: string, { method = "GET", body, schema, headers = {} }: RequestOptions<T>): Promise<ApiResult<T>> {
  const base = apiBaseUrl();
  if (!base) {
    console.error("[api] DASHBOARD_API_URL is not set");
    return { ok: false, error: apiError("UNAVAILABLE") };
  }

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: { accept: "application/json", ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`[api] ${method} ${path} could not reach the backend`, error instanceof Error ? error.name : "");
    return { ok: false, error: apiError("UNAVAILABLE") };
  }

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const code = codeForStatus(response.status);
    // Only messages meant for people (validation and conflicts) are passed through.
    const details = code === "VALIDATION" || code === "CONFLICT" ? readErrorBody(payload) : {};
    return { ok: false, error: apiError(code, response.status, details) };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    console.error(`[api] ${method} ${path} returned an unexpected shape`);
    return { ok: false, error: apiError("UNEXPECTED", response.status) };
  }
  return { ok: true, data: parsed.data };
}
