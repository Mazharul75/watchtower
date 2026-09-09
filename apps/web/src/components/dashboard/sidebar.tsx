import Link from "next/link";
import { LogoWordmark } from "@watchtower/ui";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/dashboard/settings", label: "Account settings", icon: "settings" },
];

function Icon({ name }: { name: string }) {
  if (name === "home") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Sidebar({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-background-raised)]/50 md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-[var(--color-border)] px-6">
        {/* Logged-in users click the brand mark expecting to stay inside the
            app, not land on the public marketing site — sending them to "/"
            looked exactly like an unexplained logout even though the session
            was untouched, since "/" shows Login/Signup buttons by default. */}
        <Link href="/dashboard"><LogoWordmark size={16} /></Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-foreground-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-foreground)]"
          >
            <Icon name={item.icon} />
            {item.label}
          </Link>
        ))}
        {isSuperAdmin && (
          <>
            <div className="my-3 h-px bg-[var(--color-border)]" />
            <span className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">Platform admin</span>
            <Link
              href="/admin"
              className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-foreground-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-foreground)]"
            >
              <Icon name="settings" />
              Admin console
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
