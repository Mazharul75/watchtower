import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

/**
 * Two-tier auth check, matching Auth.js v5's own guidance for database
 * session strategy: database sessions cannot be verified from the Edge
 * runtime (no Prisma/Node driver there), so middleware only does a cheap,
 * optimistic "is there a session cookie at all" redirect for UX (skip
 * rendering a protected page just to bounce the user to /login).
 *
 * The AUTHORITATIVE check — is this session token actually valid, not
 * expired, and does this user hold the required role — happens server-side
 * in Node.js runtime via requireUser()/requireSuperAdmin() (lib/rbac.ts) in
 * every protected Server Component and Route Handler. A forged or stale
 * cookie that passes this middleware still gets rejected there.
 */

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected) {
    const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);
    if (!hasSessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const nonce = generateNonce();
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com",
    "connect-src 'self' https://*.sentry.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets/images/favicon, so the CSP
     * nonce header is set app-wide while keeping the auth check scoped to
     * PROTECTED_PREFIXES above.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
