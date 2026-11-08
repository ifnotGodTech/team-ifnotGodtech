import type { DashboardBackend } from "./backend";
import { createStubBackend } from "./stub";

// The dashboard's only route to the backend. Until phase 7 it's the stand-in; then each
// function switches to the real API, slice by slice, without changing any screen.

export function getBackend(): DashboardBackend {
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("The stand-in backend must never run in production. Connect the real API first.");
  }
  return createStubBackend();
}

/** Whether screens are running against the stand-in, so they can show its test values. */
export const usingStandIn = () => process.env.VERCEL_ENV !== "production";

export type { ApiError, ApiErrorCode, ApiResult } from "./errors";
