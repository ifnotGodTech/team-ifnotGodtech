import type { DashboardBackend } from "./backend";
import { createStubBackend } from "./stub";

// The dashboard's only route to the backend. Parts not built yet use the stand-in; each moves to
// the real API slice by slice, without changing any screen. Staff log in is in staffAuth.ts.

export function getBackend(): DashboardBackend {
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("The stand-in backend must never run in production. Connect the real API first.");
  }
  return createStubBackend();
}

export type { ApiError, ApiErrorCode, ApiResult } from "./errors";
