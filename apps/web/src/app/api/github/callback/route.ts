import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyInstallState } from "@/lib/install-state";
import { getInstallationOctokit } from "@/lib/github-app";
import { writeAuditLog } from "@/lib/audit";

/**
 * GitHub redirects here after a user completes (or updates) an App
 * installation, with `installation_id` and the `state` we generated in
 * /api/github/install. We re-derive which organization initiated this from
 * the signed state — never from a client-supplied organizationId — so a
 * forged callback can't attach someone else's GitHub installation to your org.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");
  const state = searchParams.get("state");

  const failureRedirect = (message: string) => {
    const url = new URL("/dashboard", origin);
    url.searchParams.set("github_error", message);
    return NextResponse.redirect(url);
  };

  if (!installationId || !state) {
    return failureRedirect("Missing installation information from GitHub.");
  }

  const verified = verifyInstallState(state);
  if (!verified) {
    return failureRedirect("This installation link is invalid or has expired. Try connecting again.");
  }

  if (setupAction === "request") {
    // A non-admin org member requested installation from a GitHub org that
    // requires approval — nothing to ingest yet until an owner approves it.
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  try {
    const octokit = await getInstallationOctokit(installationId);
    const { data } = await octokit.request("GET /installation/repositories");

    await prisma.$transaction(
      data.repositories.map((repo) =>
        prisma.repository.upsert({
          where: { githubRepoId: String(repo.id) },
          create: {
            organizationId: verified.organizationId,
            installationId,
            githubRepoId: String(repo.id),
            owner: repo.owner.login,
            name: repo.name,
            fullName: repo.full_name,
            defaultBranch: repo.default_branch,
          },
          update: {
            installationId,
            defaultBranch: repo.default_branch,
          },
        }),
      ),
    );

    await writeAuditLog({
      actorId: null,
      action: "repo.connected",
      targetType: "Organization",
      targetId: verified.organizationId,
      metadata: { installationId, repoCount: data.repositories.length },
    });

    return NextResponse.redirect(new URL("/dashboard", origin));
  } catch {
    return failureRedirect("Could not finish connecting your repositories. Please try again.");
  }
}
