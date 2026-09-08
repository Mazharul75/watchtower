import { describe, it, expect, vi } from "vitest";
import { cleanupExpiredTokens } from "./cleanup-expired-tokens";

function makePrismaStub() {
  return {
    session: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    verificationToken: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    passwordResetToken: { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) },
  };
}

describe("cleanupExpiredTokens", () => {
  it("deletes expired sessions using an expires-lt-now filter", async () => {
    const prisma = makePrismaStub();
    const now = new Date("2026-01-01T00:00:00Z");
    await cleanupExpiredTokens(prisma, now);

    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { expires: { lt: now } } });
    expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { expires: { lt: now } } });
  });

  it("purges password reset tokens that are expired OR used more than 30 days ago", async () => {
    const prisma = makePrismaStub();
    const now = new Date("2026-01-31T00:00:00Z");
    await cleanupExpiredTokens(prisma, now);

    const call = prisma.passwordResetToken.deleteMany.mock.calls[0]?.[0];
    expect(call.where.OR).toHaveLength(2);
    expect(call.where.OR[0]).toEqual({ expires: { lt: now } });
    expect(call.where.OR[1].usedAt.lt.getTime()).toBe(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  });

  it("returns a summary combining all three counts", async () => {
    const prisma = makePrismaStub();
    const summary = await cleanupExpiredTokens(prisma);
    expect(summary).toEqual({ expiredSessions: 2, expiredVerificationTokens: 1, stalePasswordResetTokens: 3 });
  });
});
