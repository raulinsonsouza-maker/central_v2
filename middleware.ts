import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SYMBIUS_SESSION_COOKIE } from "@/lib/symbius/session-token";

const SYMBIUS_APP_PREFIX = "/app";
const SYMBIUS_PUBLIC = ["/login", "/signup", "/pricing"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(SYMBIUS_APP_PREFIX)) {
    const isPublicApp =
      SYMBIUS_PUBLIC.some((p) => pathname === p) ||
      pathname.startsWith("/app/api");

    if (!isPublicApp) {
      const token = request.cookies.get(SYMBIUS_SESSION_COOKIE)?.value;
      if (!token) {
        const login = new URL("/login", request.url);
        login.searchParams.set("next", pathname);
        return NextResponse.redirect(login);
      }

      const session = await verifySessionToken(token);
      if (!session) {
        const login = new URL("/login", request.url);
        login.searchParams.set("next", pathname);
        const res = NextResponse.redirect(login);
        res.cookies.delete(SYMBIUS_SESSION_COOKIE);
        return res;
      }
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
