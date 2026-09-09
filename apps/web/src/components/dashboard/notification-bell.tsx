"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/alert";

interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDTO[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silent — the bell just stays at its last known state. A failed
      // background poll shouldn't throw a visible error at the whole layout.
    }
  }, []);

  useEffect(() => {
    load();
    // Poll every 30s so a fix-proposal or abstained-investigation
    // notification shows up without a full page reload.
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markRead(id: string) {
    setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)) ?? null);
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
  }

  async function markAllRead() {
    setNotifications((prev) => prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null);
    setUnreadCount(0);
    await fetch("/api/notifications/read-all", { method: "POST" });
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-foreground-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-foreground)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-brand-cyan)] px-1 text-[10px] font-semibold text-[var(--color-background)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-raised)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--color-foreground)]">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-[var(--color-brand-cyan)] hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!notifications ? (
              <div className="flex items-center gap-2 p-4 text-sm text-[var(--color-foreground-muted)]">
                <Spinner /> Loading…
              </div>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-[var(--color-foreground-subtle)]">You&apos;re all caught up.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {notifications.map((n) => {
                  const body = (
                    <div className={`flex flex-col gap-0.5 px-4 py-3 ${n.readAt ? "" : "bg-white/[0.03]"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-[var(--color-foreground)]">{n.title}</p>
                        {!n.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand-cyan)]" />}
                      </div>
                      {n.body && <p className="text-xs text-[var(--color-foreground-muted)]">{n.body}</p>}
                      <p className="text-[11px] text-[var(--color-foreground-subtle)]">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link href={n.link} onClick={() => !n.readAt && markRead(n.id)} className="block hover:opacity-90">
                          {body}
                        </Link>
                      ) : (
                        <button type="button" onClick={() => !n.readAt && markRead(n.id)} className="block w-full text-left hover:opacity-90">
                          {body}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
