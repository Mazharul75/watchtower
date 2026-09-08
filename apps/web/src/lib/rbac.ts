import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { OrgRole } from "@prisma/client";
import { ROLE_RANK, roleAtLeast } from "@/lib/role-rank";
import { UnauthorizedError, ForbiddenError } from "@/lib/rbac-errors";

export { roleAtLeast, UnauthorizedError, ForbiddenError };

/** Server-side only — never trust a role claim that didn't come from this. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session.user;
}

export async function requireSuperAdmin() {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { isSuperAdmin: true } });
  if (!dbUser?.isSuperAdmin) {
    throw new ForbiddenError("Super admin access required");
  }
  return user;
}

/**
 * Confirms the current user holds at least `minRole` in the given
 * organization, by querying the OrganizationMember table directly —
 * this is what makes RBAC "server-enforced" rather than "hidden in the UI":
 * even a hand-crafted request to the API can't skip this check.
 */
export async function requireOrgRole(organizationId: string, minRole: OrgRole) {
  const user = await requireUser();
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId: user.id } },
  });
  if (!membership || ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    throw new ForbiddenError(`Requires ${minRole} role or higher in this organization`);
  }
  return { user, membership };
}
