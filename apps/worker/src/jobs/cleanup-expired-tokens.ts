/**
 * Security-hygiene job: Auth.js's database session strategy never deletes
 * expired rows on its own, and one-time verification/reset tokens are only
 * ever deleted on successful use — a token a user never clicks stays in the
 * table forever otherwise. This job purges what's safe to purge:
 *
 *  - Session rows past their `expires` timestamp.
 *  - VerificationToken rows past their `expires` timestamp.
 *  - PasswordResetToken rows that are expired OR were already used more
 *    than 30 days ago (kept briefly for audit/incident-response purposes,
 *    then purged — not kept forever).
 *
 * Runs nightly via the GitHub Actions workflow in .github/workflows/backup.yml
 * (`npm run cleanup --workspace=apps/worker`), the same schedule that
 * performs the database backup.
 */

interface DeleteManyResult {
  count: number;
}

interface PrismaLike {
  session: { deleteMany: (args: unknown) => Promise<DeleteManyResult> };
  verificationToken: { deleteMany: (args: unknown) => Promise<DeleteManyResult> };
  passwordResetToken: { deleteMany: (args: unknown) => Promise<DeleteManyResult> };
}

export interface CleanupSummary {
  expiredSessions: number;
  expiredVerificationTokens: number;
  stalePasswordResetTokens: number;
}

export async function cleanupExpiredTokens(prisma: PrismaLike, now: Date = new Date()): Promise<CleanupSummary> {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [sessions, verificationTokens, resetTokens] = await Promise.all([
    prisma.session.deleteMany({ where: { expires: { lt: now } } }),
    prisma.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
    prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ expires: { lt: now } }, { usedAt: { lt: thirtyDaysAgo } }],
      },
    }),
  ]);

  return {
    expiredSessions: sessions.count,
    expiredVerificationTokens: verificationTokens.count,
    stalePasswordResetTokens: resetTokens.count,
  };
}
