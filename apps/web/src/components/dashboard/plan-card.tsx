"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Spinner } from "@/components/ui/alert";

export function PlanCard({ organizationId, isOwner, initiallyRegistered }: { organizationId: string; isOwner: boolean; initiallyRegistered: boolean }) {
  const [registered, setRegistered] = useState(initiallyRegistered);
  const [pending, setPending] = useState(false);

  async function register() {
    setPending(true);
    try {
      const res = await fetch(`/api/orgs/${organizationId}/plan-interest`, { method: "POST" });
      if (res.ok) setRegistered(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Badge tone="success">Free — currently in beta</Badge>
        <span className="text-sm text-[var(--color-foreground-muted)]">No limits while we&apos;re testing with real users.</span>
      </div>
      <p className="text-sm leading-relaxed text-[var(--color-foreground-muted)]">
        Watchtower is free for everyone right now. Once usage and feedback validate it, a paid Pro tier (higher repo
        limits, priority investigation, team seats) will launch — existing free usage won&apos;t be taken away
        retroactively.
      </p>
      {isOwner && (
        <div>
          {registered ? (
            <p className="text-sm text-[var(--color-success-text)]">✓ You&apos;re on the list — we&apos;ll email this org when Pro launches.</p>
          ) : (
            <Button variant="secondary" size="sm" onClick={register} disabled={pending}>
              {pending && <Spinner />}
              Notify me when Pro launches
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
