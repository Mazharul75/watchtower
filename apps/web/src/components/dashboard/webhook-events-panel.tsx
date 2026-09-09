"use client";

import { useEffect, useState } from "react";
import { Badge, Spinner, Alert } from "@/components/ui/alert";

interface WebhookEventDTO {
  id: string;
  eventType: string;
  action: string | null;
  processedAt: string | null;
  error: string | null;
  receivedAt: string;
}

export function WebhookEventsPanel({ repositoryId }: { repositoryId: string }) {
  const [events, setEvents] = useState<WebhookEventDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/repos/${repositoryId}/webhook-events`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setEvents(data.events);
      })
      .catch(() => setError("Could not load webhook activity."));
  }, [repositoryId]);

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!events) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
        <Spinner /> Loading activity…
      </div>
    );
  }
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-8 text-center text-sm text-[var(--color-foreground-muted)]">
        No webhook deliveries received yet. This fills in as GitHub sends events for this repo.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {events.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <div className="min-w-0">
            <span className="font-mono text-[var(--color-foreground)]">
              {e.eventType}
              {e.action ? `.${e.action}` : ""}
            </span>
            <span className="ml-2 text-xs text-[var(--color-foreground-subtle)]">{new Date(e.receivedAt).toLocaleString()}</span>
          </div>
          {e.error ? (
            <Badge tone="danger">error</Badge>
          ) : e.processedAt ? (
            <Badge tone="success">processed</Badge>
          ) : (
            <Badge tone="warning">pending</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
