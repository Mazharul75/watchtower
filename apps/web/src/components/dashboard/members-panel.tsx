"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Spinner } from "@/components/ui/alert";

interface MemberDTO {
  id: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  joinedAt: string;
  name: string | null;
  email: string;
  username: string | null;
}

const ROLE_TONE: Record<MemberDTO["role"], "info" | "warning" | "success" | "danger"> = {
  OWNER: "success",
  ADMIN: "warning",
  MEMBER: "info",
  VIEWER: "danger",
};

export function MembersPanel({ organizationId, currentUserRole }: { organizationId: string; currentUserRole: MemberDTO["role"] }) {
  const [members, setMembers] = useState<MemberDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const isOwner = currentUserRole === "OWNER";

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orgs/${organizationId}/members`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(data.members);
    } catch {
      setError("Could not load members.");
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setFormError(null);
    const data = new FormData(form);
    try {
      const res = await fetch(`/api/orgs/${organizationId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), role: data.get("role") }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFormError(body.error ?? "Could not invite that person.");
        return;
      }
      form.reset();
      setShowInvite(false);
      await load();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function changeRole(userId: string, role: string) {
    setBusyUserId(userId);
    await fetch(`/api/orgs/${organizationId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    await load();
    setBusyUserId(null);
  }

  async function remove(userId: string) {
    setBusyUserId(userId);
    await fetch(`/api/orgs/${organizationId}/members/${userId}`, { method: "DELETE" });
    await load();
    setBusyUserId(null);
  }

  if (error) return <Alert tone="danger">{error}</Alert>;

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          {showInvite ? (
            <form onSubmit={invite} className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
              {formError && (
                <div className="sm:w-full">
                  <Alert tone="danger">{formError}</Alert>
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor="member-email">Their account email</Label>
                <Input id="member-email" name="email" type="email" required placeholder="teammate@example.com" autoFocus />
              </div>
              <div>
                <Label htmlFor="member-role">Role</Label>
                <select
                  id="member-role"
                  name="role"
                  defaultValue="MEMBER"
                  className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-brand-violet)]"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="MEMBER">Member</option>
                  {isOwner && <option value="ADMIN">Admin</option>}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending}>
                  {pending && <Spinner />}
                  Add
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowInvite(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setShowInvite(true)}>
              + Add a member
            </Button>
          )}
        </div>
      )}

      {!members ? (
        <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
          <Spinner /> Loading members…
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--color-foreground)]">{m.name ?? m.email}</p>
                <p className="truncate text-xs text-[var(--color-foreground-subtle)]">{m.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isOwner && m.role !== "OWNER" ? (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.userId, e.target.value)}
                    disabled={busyUserId === m.userId}
                    className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 text-xs text-[var(--color-foreground)] outline-none focus:border-[var(--color-brand-violet)]"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                ) : (
                  <Badge tone={ROLE_TONE[m.role]}>{m.role.toLowerCase()}</Badge>
                )}
                {canManage && m.role !== "OWNER" && (isOwner || m.role !== "ADMIN") && (
                  <Button variant="ghost" size="sm" onClick={() => remove(m.userId)} disabled={busyUserId === m.userId}>
                    {busyUserId === m.userId ? <Spinner /> : "Remove"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
