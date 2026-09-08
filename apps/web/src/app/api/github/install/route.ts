import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { signInstallState } from "@/lib/install-state";
import { getGitHubAppSlug } from "@/lib/github-app";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");

  const failureRedirect = (message: string) => {
    const url = new URL(organizationId ? `/dashboard/orgs/${organizationId}` : "/dashboard", origin);
    url.searchParams.set("github_error", message);
    return NextResponse.redirect(url);
  };

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }

  try {
    // Only an org admin/owner can connect repositories to it.
    await requireOrgRole(organizationId, "ADMIN");

    const flag = await prisma.featureFlag.findUnique({ where: { key: "phase2.github_ingestion" } });
    if (!flag?.enabled) {
      return failureRedirect("GitHub repository connections aren't enabled on this instance yet. Ask a platform admin to turn on the phase2.github_ingestion feature flag.");
    }

    const state = signInstallState(organizationId);
    const slug = getGitHubAppSlug();
    return NextResponse.redirect(`https://github.com/apps/${slug}/installations/new?state=${encodeURIComponent(state)}`);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof Error && err.message.includes("GITHUB_APP")) {
      return failureRedirect("The GitHub App hasn't been configured on this server yet (see README).");
    }
    throw err;
  }
}
