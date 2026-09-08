/**
 * Auth.js v5 picks a secure-prefixed cookie name automatically based on the
 * request protocol, but the impersonation routes below need to read/write
 * that exact cookie outside of Auth.js's own code — so we fix the name
 * explicitly here and pass it into the NextAuth() config in auth.ts,
 * instead of relying on an internal default the two call sites could drift
 * out of sync on.
 */
const isProd = process.env.NODE_ENV === "production";

export const SESSION_COOKIE_NAME = isProd ? "__Secure-authjs.session-token" : "authjs.session-token";

/** Holds the platform admin's own session token while they are impersonating another user. */
export const IMPERSONATOR_COOKIE_NAME = "wt-impersonator-token";

export const secureCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: isProd,
};

/** Matches the `session.maxAge` configured on the NextAuth() call in auth.ts. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
