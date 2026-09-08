"use client";

import { useEffect, useState } from "react";
import { Spinner, Alert } from "@/components/ui/alert";

interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  createdAt: string;
}

export function OrgsTab() {
  const [orgs, setOrgs] = useState<AdminOrg[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/orgs")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setOrgs(data.organizations);
      });
  }, []);

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!orgs) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
        <Spinner /> Loading organizations…
      </div>
    );
  }

  if (orgs.length === 0) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">No organizations have been created yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-[var(--color-border)] text-[var(--color-foreground-subtle)]">
          <th className="py-2 pr-4 font-medium">Organization</th>
          <th className="py-2 pr-4 font-medium">Members</th>
          <th className="py-2 font-medium">Created</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--color-border)]">
        {orgs.map((o) => (
          <tr key={o.id}>
            <td className="py-3 pr-4">
              <p className="font-medium text-[var(--color-foreground)]">{o.name}</p>
              <p className="text-xs text-[var(--color-foreground-subtle)]">/{o.slug}</p>
            </td>
            <td className="py-3 pr-4">{o.memberCount}</td>
            <td className="py-3 text-[var(--color-foreground-subtle)]">{new Date(o.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
