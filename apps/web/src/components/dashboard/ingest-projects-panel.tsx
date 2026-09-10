"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Spinner } from "@/components/ui/alert";

interface ProjectDTO {
  id: string;
  name: string;
  publicKey: string;
  createdAt: string;
  totalGroups: number;
  unresolvedGroups: number;
}

function snippetFor(publicKey: string, origin: string): string {
  return `<script>
(function () {
  var WT_KEY = "${publicKey}";
  var WT_ENDPOINT = "${origin}/api/ingest/errors";
  function report(message, extra) {
    try {
      fetch(WT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({ key: WT_KEY, message: message, url: location.href }, extra || {})),
      });
    } catch (e) {}
  }
  window.addEventListener("error", function (e) {
    report(e.message, { stackTrace: e.error && e.error.stack, level: "ERROR" });
  });
  window.addEventListener("unhandledrejection", function (e) {
    var reason = e.reason;
    report("Unhandled promise rejection: " + (reason && reason.message ? reason.message : reason), {
      stackTrace: reason && reason.stack,
      level: "ERROR",
    });
  });
})();
</script>`;
}

export function IngestProjectsPanel({ organizationId, canManage, origin }: { organizationId: string; canManage: boolean; origin: string }) {
  const [projects, setProjects] = useState<ProjectDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testPendingId, setTestPendingId] = useState<string | null>(null);
  const [testSentId, setTestSentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orgs/${organizationId}/ingest-projects`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProjects(data.projects);
    } catch {
      setError("Could not load projects.");
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setFormError(null);
    const name = new FormData(form).get("name");
    try {
      const res = await fetch(`/api/orgs/${organizationId}/ingest-projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Could not create project.");
        return;
      }
      form.reset();
      setShowForm(false);
      setExpandedId(data.id);
      await load();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this project? Every error group and event under it will be deleted too.")) return;
    setBusyId(id);
    await fetch(`/api/orgs/${organizationId}/ingest-projects/${id}`, { method: "DELETE" });
    await load();
    setBusyId(null);
  }

  function copySnippet(id: string, snippet: string) {
    navigator.clipboard?.writeText(snippet).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  async function sendTestError(id: string) {
    setTestPendingId(id);
    setTestSentId(null);
    try {
      const res = await fetch(`/api/orgs/${organizationId}/ingest-projects/${id}/test-error`, { method: "POST" });
      if (res.ok) {
        setTestSentId(id);
        await load();
      }
    } finally {
      setTestPendingId(null);
    }
  }

  if (error) return <Alert tone="danger">{error}</Alert>;

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          {showForm ? (
            <form onSubmit={create} className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
              {formError && (
                <div className="sm:w-full">
                  <Alert tone="danger">{formError}</Alert>
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor="project-name">Project name</Label>
                <Input id="project-name" name="name" required maxLength={60} autoFocus placeholder="e.g. marketing site, mobile app" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending}>
                  {pending && <Spinner />}
                  Create
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              + New project
            </Button>
          )}
        </div>
      )}

      {!projects ? (
        <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
          <Spinner /> Loading projects…
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-8 text-center text-sm text-[var(--color-foreground-muted)]">
          No projects yet. Create one to get a snippet you can drop into any app — it doesn&apos;t need to be on GitHub or connected to Watchtower any other way.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((p) => {
            const snippet = snippetFor(p.publicKey, origin);
            const isExpanded = expandedId === p.id;
            return (
              <li key={p.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/dashboard/orgs/${organizationId}/errors/${p.id}`} className="min-w-0 hover:opacity-80">
                    <p className="truncate font-medium text-[var(--color-foreground)]">{p.name}</p>
                    <p className="text-xs text-[var(--color-foreground-subtle)]">
                      {p.totalGroups} error type{p.totalGroups === 1 ? "" : "s"} tracked
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    {p.unresolvedGroups > 0 && <Badge tone="danger">{p.unresolvedGroups} unresolved</Badge>}
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                      {isExpanded ? "Hide snippet" : "Get snippet"}
                    </Button>
                    {canManage && (
                      <Button variant="ghost" size="sm" onClick={() => remove(p.id)} disabled={busyId === p.id}>
                        {busyId === p.id ? <Spinner /> : "Delete"}
                      </Button>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                    <p className="mb-2 text-xs text-[var(--color-foreground-muted)]">
                      Paste this before the closing <code className="text-[11px]">&lt;/body&gt;</code> tag of the app you want to monitor:
                    </p>
                    <pre className="overflow-x-auto rounded-lg bg-[#0F172A] p-3 text-[11px] leading-relaxed text-slate-100">
                      <code>{snippet}</code>
                    </pre>
                    <div className="mt-2 flex items-center gap-3">
                      <Button size="sm" variant="outline" onClick={() => copySnippet(p.id, snippet)}>
                        {copiedId === p.id ? "Copied!" : "Copy snippet"}
                      </Button>
                      {canManage && (
                        <Button size="sm" variant="ghost" onClick={() => sendTestError(p.id)} disabled={testPendingId === p.id}>
                          {testPendingId === p.id && <Spinner />}
                          Send a test error
                        </Button>
                      )}
                      {testSentId === p.id && (
                        <span className="text-xs text-[var(--color-success-text)]">
                          Sent —{" "}
                          <Link href={`/dashboard/orgs/${organizationId}/errors/${p.id}`} className="text-[var(--color-link)] hover:underline">
                            view it
                          </Link>
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-[var(--color-foreground-subtle)]">
                      Don&apos;t have a site to paste the snippet into yet? Use &ldquo;Send a test error&rdquo; to see the pipeline
                      work right now.
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
