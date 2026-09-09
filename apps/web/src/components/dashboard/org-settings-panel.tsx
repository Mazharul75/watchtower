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
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  currentUserId: string;
}

export function OrgSettingsPanel({ organizationId, organizationName, currentUserRole, currentUserId }: Props) {
  const router = useRouter();
  const isOwner = currentUserRole === "OWNER";

  const [name, setName] = useState(organizationName);
  const [renamePending, setRenamePending] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSaved, setRenameSaved] = useState(false);

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
