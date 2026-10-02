import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/tokens";

const PROTECTED_PREFIXES = ["/sites"];

/**
 * Optimistic route protection based on the presence of a session cookie.
 * Pages and Server Actions still validate the session against the database.
 *
 * Signed-in users are intentionally not redirected away from /login here: a cookie
 * can be stale (expired or revoked), and redirecting on its presence alone would loop.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
