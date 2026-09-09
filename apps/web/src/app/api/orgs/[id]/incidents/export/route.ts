import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";

function csvEscape(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: organizationId } = await context.params;
    await requireOrgRole(organizationId, "VIEWER");

    const incidents = await prisma.incident.findMany({
      where: { repository: { organizationId } },
      orderBy: { createdAt: "desc" },
      take: 10_000,
      include: {
        repository: { select: { fullName: true } },
        triggerNode: { select: { type: true, externalId: true, title: true } },
        fixProposal: { select: { status: true, prUrl: true } },
      },
    });

    const header = ["created_at", "repository", "trigger_type", "trigger_id", "trigger_title", "status", "confidence", "fix_status", "fix_pr_url"];
    const rows = incidents.map((i) =>
      [
        i.createdAt.toISOString(),
        i.repository.fullName,
        i.triggerNode.type,
        i.triggerNode.externalId,
        i.triggerNode.title ?? "",
        i.status,
        i.confidence != null ? Math.round(i.confidence * 100) + "%" : "",
        i.fixProposal?.status ?? "",
        i.fixProposal?.prUrl ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="watchtower-incidents-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
