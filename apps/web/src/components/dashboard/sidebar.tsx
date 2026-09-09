import Link from "next/link";
import { LogoWordmark } from "@watchtower/ui";

const MAIN_NAV = [{ href: "/dashboard", label: "Overview", icon: "home" }];

// Each solution is its own standalone product (see docs on the org page's
// "Solutions" section) — these are real top-level destinations, not
// buried inside a dropdown or only reachable after already being on an
// org's page. Each one resolves to the right organization automatically.
const SOLUTIONS_NAV = [
  { href: "/dashboard/github", label: "GitHub Engineering Memory", icon: "github" },
  { href: "/dashboard/errors", label: "Error Tracking", icon: "bug" },
  { href: "/dashboard/chatbots", label: "AI Chatbots", icon: "chat" },
];

const ACCOUNT_NAV = [{ href: "/dashboard/settings", label: "Account settings", icon: "settings" }];

function Icon({ name }: { name: string }) {
  if (name === "home") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "github") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.79-.25.79-.55v-1.94c-3.2.7-3.87-1.54-3.87-1.54-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.42.36.78 1.08.78 2.17v3.22c0 .3.22.65.79.55A10.51 10.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
      </svg>
    );
  }
  if (name === "bug") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="8" y="7" width="8" height="12" rx="4" />
        <path d="M8 10H4M8 14H4M16 10h4M16 14h4M9 5l1.5 2M15 5l-1.5 2M12 7V4" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "chat") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 5h16v11H8l-4 4V5Z" strokeLinecap="round" strokeLinejoin="round" />
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

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-foreground-muted)] transition-colors hover:bg-black/[0.04] hover:text-[var(--color-foreground)]"
    >
      <Icon name={icon} />
      {label}
    </Link>
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
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        {MAIN_NAV.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        <div className="my-3 h-px bg-[var(--color-border)]" />
        <span className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">Solutions</span>
        <div className="mt-1 flex flex-col gap-1">
          {SOLUTIONS_NAV.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        <div className="my-3 h-px bg-[var(--color-border)]" />
        {ACCOUNT_NAV.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        {isSuperAdmin && (
          <>
            <div className="my-3 h-px bg-[var(--color-border)]" />
            <span className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">Platform admin</span>
            <div className="mt-1">
              <NavLink href="/admin" label="Admin console" icon="settings" />
            </div>
          </>
        )}
      </nav>
    </aside>
  );
}
