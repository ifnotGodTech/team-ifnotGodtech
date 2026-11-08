import { NextResponse, type NextRequest } from "next/server";
import { loginPath, safeNextPath } from "@/lib/auth/paths";
import { checkSession, encodeSession, LOGGED_OUT_COOKIE, loggedOutAt, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { cookieSecret } from "@/lib/auth/signing";

// Runs before every page. It restarts the 1-hour session on each request, and sends
// signed-out visitors to log in, remembering where they were going. Pages and form
// actions still check the session themselves: this is a convenience, not the guard.
export function proxy(request: NextRequest) {
  // Nothing is reachable on the live site until the real backend is connected (phase 7).
  if (process.env.VERCEL_ENV === "production") return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/login")) return NextResponse.next();

  const secret = cookieSecret();
  const loggedOut = loggedOutAt(request.cookies.get(LOGGED_OUT_COOKIE)?.value, secret);
  const session = checkSession(request.cookies.get(SESSION_COOKIE)?.value, secret, Date.now(), loggedOut);

  if (session.status === "active") {
    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE, encodeSession(session.staff, secret, Date.now(), session.startedAt), sessionCookieOptions);
    return response;
  }

  // Form actions arrive as POSTs and refuse signed-out callers themselves.
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();

  const next = safeNextPath(pathname + search);
  return NextResponse.redirect(new URL(loginPath(next, session.status === "expired" ? "expired" : undefined), request.url));
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|icon.png|robots.txt|ifnotgod-icon.png).*)"],
};
