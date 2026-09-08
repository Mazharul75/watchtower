"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge, Spinner, Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface AdminUser {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  emailVerified: string | null;
  isSuperAdmin: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  _count: { memberships: number; sessions: number };
}

export function UsersTab() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<AdminUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setUsers(data.users);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmImpersonate() {
    if (!impersonateTarget) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/impersonate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: impersonateTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
      setImpersonateTarget(null);
    }
  }

  async function confirmSuspend() {
    if (!suspendTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${suspendTarget.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: suspendReason || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setSuspendTarget(null);
      setSuspendReason("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function unsuspend(userId: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/users/${userId}/unsuspend`, { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!users) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
        <Spinner /> Loading users…
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-foreground-subtle)]">
              <th className="py-2 pr-4 font-medium">User</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Orgs</th>
              <th className="py-2 pr-4 font-medium">Sessions</th>
              <th className="py-2 pr-4 font-medium">Role</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-3 pr-4">
                  <p className="font-medium text-[var(--color-foreground)]">{u.name ?? u.username ?? "—"}</p>
                  <p className="text-xs text-[var(--color-foreground-subtle)]">{u.email}</p>
                </td>
                <td className="py-3 pr-4">
                  {u.suspendedAt ? (
                    <Badge tone="danger">Suspended</Badge>
                  ) : (
                    <Badge tone={u.emailVerified ? "success" : "warning"}>{u.emailVerified ? "Verified" : "Pending"}</Badge>
                  )}
                </td>
                <td className="py-3 pr-4">{u._count.memberships}</td>
                <td className="py-3 pr-4">{u._count.sessions}</td>
                <td className="py-3 pr-4">{u.isSuperAdmin && <Badge tone="info">Super admin</Badge>}</td>
                <td className="py-3 text-right">
                  {!u.isSuperAdmin && (
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setImpersonateTarget(u)}>
                        Impersonate
                      </Button>
                      {u.suspendedAt ? (
                        <Button variant="outline" size="sm" onClick={() => unsuspend(u.id)} disabled={busy}>
                          Unsuspend
                        </Button>
                      ) : (
                        <Button variant="danger" size="sm" onClick={() => setSuspendTarget(u)}>
                          Suspend
                        </Button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!impersonateTarget} title="Impersonate this user?" onClose={() => setImpersonateTarget(null)}>
        <p className="mb-5 text-sm text-[var(--color-foreground-muted)]">
          You are about to sign in as <strong>{impersonateTarget?.email}</strong>. This action is written to the
          audit log with your admin account as the actor, and the impersonation session expires automatically after
          1 hour. Use this only for support with the user&apos;s knowledge.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setImpersonateTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmImpersonate} disabled={busy}>
            {busy && <Spinner />}
            Yes, impersonate
          </Button>
        </div>
      </Modal>

      <Modal open={!!suspendTarget} title="Suspend this user?" onClose={() => setSuspendTarget(null)}>
        <p className="mb-3 text-sm text-[var(--color-foreground-muted)]">
          <strong>{suspendTarget?.email}</strong> will be immediately signed out everywhere and unable to log back in
          — by password or OAuth — until unsuspended. This is written to the audit log.
        </p>
        <label className="mb-1.5 block text-sm font-medium">Reason (optional, visible to other admins)</label>
        <textarea
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
          className="mb-5 h-20 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-sm"
          maxLength={500}
        />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setSuspendTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmSuspend} disabled={busy}>
            {busy && <Spinner />}
            Yes, suspend
          </Button>
        </div>
      </Modal>
    </>
  );
}
