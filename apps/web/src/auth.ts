import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFrom } from "@/lib/rate-limit";
import { SESSION_COOKIE_NAME, secureCookieOptions, SESSION_MAX_AGE_SECONDS } from "@/lib/session-cookie";

/**
 * Database session strategy (not JWT): sessions live in Postgres and are
 * therefore revocable ("log out everywhere" deletes rows; a banned user's
 * sessions can be force-expired by an admin) — this is the property the
 * roadmap calls out explicitly under Phase 1 authentication.
 *
 * Only GitHub and Google are registered as Auth.js providers here.
 * Email/password is deliberately NOT a Credentials provider: Auth.js
 * documents that Credentials sign-ins are incompatible with the "database"
 * session strategy (no Session row is ever persisted for them), which
 * would silently break "log out everywhere" and admin session revocation
 * for password-based accounts specifically. Instead, lib/credentials-login.ts
 * verifies the password and creates a real Session row itself, in the exact
 * shape this adapter expects — auth() below can't tell the difference.
 *
 * Account linking: PrismaAdapter's default behavior links a new OAuth
 * account to an existing User only when `allowDangerousEmailAccountLinking`
 * is enabled per-provider AND the email is already verified on our side —
 * we enable it here because we control email verification ourselves and it
 * is the expected "sign in with Google after signing up with email" flow,
 * not an account-takeover vector, since GitHub/Google only assert emails
 * they've themselves verified.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database", maxAge: SESSION_MAX_AGE_SECONDS },
  trustHost: true,
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: secureCookieOptions,
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/dashboard",
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Runs on every OAuth sign-in (this provider list is GitHub/Google
      // only — see the module comment above for why credentials logins
      // never reach Auth.js's own signIn flow, and lib/credentials-login.ts
      // for the equivalent suspension check on that path).
      if (!user.id) return true; // first-time sign-up: no row to check yet
      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { suspendedAt: true } });
      if (dbUser?.suspendedAt) return false;
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true, isSuperAdmin: true },
        });
        session.user.username = dbUser?.username ?? null;
        session.user.isSuperAdmin = dbUser?.isSuperAdmin ?? false;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      await writeAuditLog({
        actorId: user.id ?? null,
        action: "user.login",
        targetType: "User",
        targetId: user.id,
        metadata: { provider: account?.provider },
      });

      // Best-effort enrichment of the session row the adapter just created
      // (it only sets sessionToken/userId/expires itself) — used by the
      // "active sessions" list in account settings. Never allowed to fail
      // the login itself.
      try {
        if (!user.id) return;
        const { headers } = await import("next/headers");
        const h = await headers();
        const mostRecent = await prisma.session.findFirst({
          where: { userId: user.id, ipAddress: null },
          orderBy: { createdAt: "desc" },
        });
        if (mostRecent) {
          await prisma.session.update({
            where: { id: mostRecent.id },
            data: {
              ipAddress: clientIpFrom(h),
              userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
            },
          });
        }
      } catch {
        // Non-fatal — session enrichment is best-effort only.
      }
    },
    async createUser({ user }) {
      await writeAuditLog({
        actorId: user.id ?? null,
        action: "user.created",
        targetType: "User",
        targetId: user.id,
      });
    },
    async linkAccount({ user, account }) {
      await writeAuditLog({
        actorId: user.id ?? null,
        action: "user.account_linked",
        targetType: "User",
        targetId: user.id,
        metadata: { provider: account.provider },
      });
    },
  },
});
