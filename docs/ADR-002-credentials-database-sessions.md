# ADR-002: Email/password login bypasses Auth.js's Credentials provider session flow

## Status
Accepted — Phase 1 (discovered and fixed during implementation).

## Context
The roadmap requires DB-backed, revocable sessions for **every** authentication
method — OAuth and email/password alike — so that "log out everywhere" and
admin-forced session expiry work uniformly regardless of how a user signed in.

Auth.js v5's `session: { strategy: "database" }` is exactly this: sessions
live in the `Session` table via the Prisma adapter. However, Auth.js
documents (and we confirmed empirically while building this) that its
**Credentials provider does not create a database session** when database
strategy is active — `signIn("credentials", ...)` validates the user via
`authorize()` but the adapter never persists a `Session` row for it. This is
an intentional Auth.js constraint, not a bug: it assumes a credentials login
has no backing OAuth `Account` to hang a session off of. In practice this
meant: after a successful credentials login, `auth()` on the very next
request returned `null` — layouts and pages immediately bounced back to
`/login`, because there was, genuinely, no session row anywhere.

## Decision
GitHub and Google continue to go through Auth.js's own adapter-backed
`signIn(provider, ...)` flow unchanged — OAuth logins get a real, adapter-
created `Session` row exactly as intended.

Email/password login does **not** use a Credentials provider at all.
`src/lib/credentials-login.ts` performs the verification (rate limit, user
lookup, `emailVerified` check, Argon2id password check) and then creates the
`Session` row and sets the session cookie **itself**, using the identical
shape the Prisma adapter would have used (`sessionToken`, `userId`,
`expires`, same cookie name). `auth()` cannot tell the difference — it just
reads the `Session` table — so every downstream RBAC check, "active
sessions" list, and admin-forced revocation works identically regardless of
which path created the row.

## Consequences
- No dependency on a library behavior that fundamentally can't do what the
  roadmap requires, instead of quietly falling back to JWT sessions for
  password users only (which would have made "log out everywhere" behave
  differently depending on login method — exactly the inconsistency the
  roadmap called out).
- One more piece of security-sensitive code we own directly (session
  creation) rather than delegating to the framework — mitigated by it being
  a small, fully-tested module (`credentials-login.ts`) using the same
  primitives (Argon2id, rate limiting, audit logging) already used elsewhere.
- The client-side login form does **not** rely on Auth.js's built-in
  server-side redirect after sign-in (see `loginAction`'s and
  `LoginForm`'s comments): the target page's own auth check would otherwise
  render, in-process, using the *original* request's cookies — before the
  just-set session cookie is visible to a fresh request — and bounce back to
  `/login`. The Server Action instead returns `{ success: true }` and the
  client performs `router.push(callbackUrl)`, which is a normal follow-up
  browser request that correctly carries the new cookie.
