/**
 * Kept in their own zero-dependency module (no auth.ts, no Prisma, no
 * "server-only") so code that only needs to throw/catch these — like
 * fix-proposal.ts — doesn't drag in the full next-auth import chain,
 * which fails to resolve under Vitest's plain Node module resolution
 * (see role-rank.ts for the same pattern applied to role comparison).
 */
export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}
