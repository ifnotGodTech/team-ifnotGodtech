export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "UNEXPECTED";

/** Every backend failure, in one shape the screens can show. Never a raw error. */
export type ApiError = {
  code: ApiErrorCode;
  /** The HTTP status, or null when the backend couldn't be reached. */
  status: number | null;
  message: string;
  /** Per-field messages from the backend's validation, keyed by field name. */
  fieldErrors: Record<string, string>;
  /** The backend's more specific reason, such as "TOO_MANY_CODES", for screens that act on it. */
  detailCode?: string;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  UNAUTHENTICATED: "Your session has ended. Please log in again.",
  FORBIDDEN: "You don't have access to that.",
  NOT_FOUND: "We couldn't find that. It may have been removed.",
  VALIDATION: "Please check the highlighted fields and try again.",
  CONFLICT: "That couldn't be saved, because something changed in the meantime. Refresh and try again.",
  RATE_LIMITED: "Too many attempts. Please wait a few minutes, then try again.",
  UNAVAILABLE: "The dashboard can't reach the server right now. Please try again in a moment.",
  UNEXPECTED: "Something went wrong. Please try again, and tell the team if it keeps happening.",
};

export function codeForStatus(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 400 || status === 422) return "VALIDATION";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "UNAVAILABLE";
  return "UNEXPECTED";
}

export function apiError(
  code: ApiErrorCode,
  status: number | null = null,
  details: { message?: string; fieldErrors?: Record<string, string>; detailCode?: string } = {}
): ApiError {
  const error: ApiError = { code, status, message: details.message || DEFAULT_MESSAGES[code], fieldErrors: details.fieldErrors ?? {} };
  if (details.detailCode) error.detailCode = details.detailCode;
  return error;
}
