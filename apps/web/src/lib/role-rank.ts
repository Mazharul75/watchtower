import type { OrgRole } from "@prisma/client";

/**
 * Pure role-ranking logic, deliberately kept in its own zero-dependency
 * module (no auth.ts, no Prisma client instance, no "server-only") so it can
 * be unit tested without dragging in the full next-auth/Prisma import chain.
 * lib/rbac.ts re-exports this for the DB-backed RBAC checks.
 */
export const ROLE_RANK: Record<OrgRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function roleAtLeast(role: OrgRole, minRole: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}
