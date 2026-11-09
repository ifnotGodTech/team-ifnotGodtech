import { NextResponse, type NextRequest } from "next/server";
import { loginPath, safeNextPath } from "@/lib/auth/paths";
import { checkSession, encodeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { cookieSecret } from "@/lib/auth/signing";

// Runs before every page. It restarts the cookie's hour on each request, and sends signed-out
// visitors to log in, remembering where they were going. It doesn't call the backend: pages and
// form actions confirm the token themselves through requireStaff. This is a convenience, not the guard.
export function proxy(request: NextRequest) {
  // Nothing is reachable on the live site until the real backend is connected.
  if (process.env.VERCEL_ENV === "production") return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/login")) return NextResponse.next();

  const secret = cookieSecret();
  const session = checkSession(request.cookies.get(SESSION_COOKIE)?.value, secret, Date.now());

  if (session.status === "active") {
    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE, encodeSession(session.staff, session.token, secret, Date.now()), sessionCookieOptions);
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
