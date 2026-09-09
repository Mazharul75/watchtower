"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert, Spinner } from "@/components/ui/alert";

interface Props {
  organizationId: string;
  organizationName: string;
  slackWebhookUrl: string | null;
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  currentUserId: string;
}

export function OrgSettingsPanel({ organizationId, organizationName, slackWebhookUrl, currentUserRole, currentUserId }: Props) {
  const router = useRouter();
  const isOwner = currentUserRole === "OWNER";

  const [name, setName] = useState(organizationName);
  const [renamePending, setRenamePending] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSaved, setRenameSaved] = useState(false);

  const [slackUrl, setSlackUrl] = useState(slackWebhookUrl ?? "");
  const [slackPending, setSlackPending] = useState(false);
  const [slackError, setSlackError] = useState<string | null>(null);
  const [slackSaved, setSlackSaved] = useState(false);
  const [testPending, setTestPending] = useState(false);
  const [testMessage, setTestMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [confirmText, setConfirmText] = useState("");
  const [dangerPending, setDangerPending] = useState(false);
  const [dangerError, setDangerError] = useState<string | null>(null);

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRenamePending(true);
    setRenameError(null);
    setRenameSaved(false);
    try {
      const res = await fetch(`/api/orgs/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRenameError(data.error ?? "Could not rename this organization.");
        return;
      }
      setRenameSaved(true);
      router.refresh();
    } catch {
      setRenameError("Network error. Please try again.");
    } finally {
      setRenamePending(false);
    }
  }

  async function saveSlack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSlackPending(true);
    setSlackError(null);
    setSlackSaved(false);
    setTestMessage(null);
    try {
      const res = await fetch(`/api/orgs/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slackWebhookUrl: slackUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSlackError(data.error ?? "Could not save the Slack webhook.");
        return;
      }
      setSlackSaved(true);
      router.refresh();
    } catch {
      setSlackError("Network error. Please try again.");
    } finally {
      setSlackPending(false);
    }
  }

  async function sendTestMessage() {
    setTestPending(true);
    setTestMessage(null);
    try {
      const res = await fetch(`/api/orgs/${organizationId}/slack-test`, { method: "POST" });
      const data = await res.json();
      setTestMessage(res.ok ? { ok: true, text: "Test message sent — check your Slack channel." } : { ok: false, text: data.error ?? "Could not send." });
    } catch {
      setTestMessage({ ok: false, text: "Network error. Please try again." });
    } finally {
      setTestPending(false);
    }
  }

  async function deleteOrg() {
    setDangerPending(true);
    setDangerError(null);
    try {
      const res = await fetch(`/api/orgs/${organizationId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDangerError(data.error ?? "Could not delete this organization.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setDangerError("Network error. Please try again.");
    } finally {
      setDangerPending(false);
    }
  }

  async function leaveOrg() {
    setDangerPending(true);
    setDangerError(null);
    try {
      const res = await fetch(`/api/orgs/${organizationId}/members/${currentUserId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDangerError(data.error ?? "Could not leave this organization.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setDangerError("Network error. Please try again.");
    } finally {
      setDangerPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <CardHeader title="Organization name" />
        {isOwner ? (
          <form onSubmit={rename} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {renameError && (
              <div className="sm:w-full">
                <Alert tone="danger">{renameError}</Alert>
              </div>
            )}
            <div className="flex-1">
              <Label htmlFor="org-name-edit">Name</Label>
              <Input id="org-name-edit" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={64} required />
            </div>
            <Button type="submit" disabled={renamePending || name === organizationName}>
              {renamePending && <Spinner />}
              Save
            </Button>
            {renameSaved && <span className="text-sm text-[var(--color-success-text)]">Saved.</span>}
          </form>
        ) : (
          <p className="text-sm text-[var(--color-foreground-subtle)]">Only an owner can rename this organization.</p>
        )}
      </Card>

      <Card className="p-6">
        <CardHeader
          title="Slack notifications"
          description="When a fix proposal is ready for review, Watchtower posts it here too — in addition to the in-app notification."
        />
        {isOwner ? (
          <div className="flex flex-col gap-3">
            <form onSubmit={saveSlack} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              {slackError && (
                <div className="sm:w-full">
                  <Alert tone="danger">{slackError}</Alert>
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor="slack-webhook">Incoming Webhook URL</Label>
                <Input
                  id="slack-webhook"
                  value={slackUrl}
                  onChange={(e) => setSlackUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/…"
                />
                <p className="mt-1.5 text-xs text-[var(--color-foreground-subtle)]">
                  Create one free at{" "}
                  <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer" className="text-[var(--color-link)] hover:underline">
                    api.slack.com/messaging/webhooks
                  </a>
                  . Leave blank to disable.
                </p>
              </div>
              <Button type="submit" disabled={slackPending || slackUrl === (slackWebhookUrl ?? "")}>
                {slackPending && <Spinner />}
                Save
              </Button>
              {slackSaved && <span className="text-sm text-[var(--color-success-text)]">Saved.</span>}
            </form>
            {slackWebhookUrl && (
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={sendTestMessage} disabled={testPending}>
                  {testPending && <Spinner />}
                  Send test message
                </Button>
                {testMessage && (
                  <span className={`text-sm ${testMessage.ok ? "text-[var(--color-success-text)]" : "text-[var(--color-danger-text)]"}`}>{testMessage.text}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-foreground-subtle)]">Only an owner can configure Slack notifications.</p>
        )}
      </Card>

      <Card className="border-[var(--color-danger)]/30 p-6">
        <CardHeader title="Danger zone" />
        {dangerError && <Alert tone="danger">{dangerError}</Alert>}

        {isOwner ? (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Deleting <strong>{organizationName}</strong> permanently removes every connected repository, ingested graph, incident, and
              member from it. This cannot be undone.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Type "${organizationName}" to confirm`}
                className="sm:max-w-xs"
              />
              <Button variant="danger" onClick={deleteOrg} disabled={dangerPending || confirmText !== organizationName}>
                {dangerPending && <Spinner />}
                Delete organization permanently
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-[var(--color-foreground-muted)]">You can leave this organization at any time.</p>
            <div>
              <Button variant="danger" onClick={leaveOrg} disabled={dangerPending}>
                {dangerPending && <Spinner />}
                Leave organization
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
