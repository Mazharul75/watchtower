import Link from "next/link";
import { LogoWordmark } from "@watchtower/ui";

const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Solutions", href: "/#solutions" },
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "FAQ", href: "/#faq" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Sign up", href: "/signup" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "Source on GitHub", href: "https://github.com/Mazharul75/watchtower", external: true },
      { label: "MIT License", href: "https://github.com/Mazharul75/watchtower/blob/main/LICENSE", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <LogoWordmark size={16} />
          <p className="mt-3 max-w-sm text-sm text-[var(--color-foreground-muted)]">
            AI engineering memory for GitHub repos — grounded root-cause analysis, an evidence trail, and a human
            approval gate on every fix.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title} className="flex flex-col gap-2.5 text-sm text-[var(--color-foreground-muted)]">
            <span className="font-medium text-[var(--color-foreground)]">{col.title}</span>
            {col.links.map((l) =>
              l.external ? (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="hover:text-[var(--color-foreground)]">
                  {l.label}
                </a>
              ) : (
                <Link key={l.label} href={l.href} className="hover:text-[var(--color-foreground)]">
                  {l.label}
                </Link>
              ),
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--color-border)] px-6 py-6 text-center text-xs text-[var(--color-foreground-subtle)]">
        © {new Date().getFullYear()} Watchtower. MIT Licensed. Built in the open.
      </div>
    </footer>
  );
}
