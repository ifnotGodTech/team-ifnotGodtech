import type { LoginChallenge, StaffMember } from "@/types/staff";
import type { ApiResult } from "./errors";

/** What the screens need from the backend. The stand-in and, in phase 7, the real API both provide it. */
export type DashboardBackend = {
  /** Checks the password and emails a 6-digit code. */
  logIn(email: string, password: string): Promise<ApiResult<LoginChallenge>>;
  verifyCode(challengeId: string, code: string): Promise<ApiResult<StaffMember>>;
  resendCode(challengeId: string): Promise<ApiResult<LoginChallenge>>;
};
