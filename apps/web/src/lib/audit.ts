import "server-only";
import { prisma } from "@/lib/prisma";

interface WriteAuditLogInput {
  actorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Every privileged or security-sensitive action (login, register, password
 * reset, role change, admin impersonation, org creation) writes here. This
 * is what makes "who did what, when" answerable later — required by the
 * Phase 4 admin console and by the security baseline in general.
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
      ipAddress: input.ipAddress ?? undefined,
    },
  });
}
