import Link from "next/link";
import { LogoWordmark } from "@watchtower/ui";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)]">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-12 md:flex-row md:items-center">
        <div>
          <LogoWordmark size={16} />
          <p className="mt-3 max-w-sm text-sm text-[var(--color-foreground-muted)]">
            AI engineering memory for GitHub repos — grounded root-cause analysis, an evidence trail, and a human
            approval gate on every fix.
          </p>
        </div>
        <div className="flex gap-10 text-sm text-[var(--color-foreground-muted)]">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-[var(--color-foreground)]">Product</span>
            <Link href="/#features" className="hover:text-[var(--color-foreground)]">Features</Link>
            <Link href="/#how-it-works" className="hover:text-[var(--color-foreground)]">How it works</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-[var(--color-foreground)]">Account</span>
            <Link href="/login" className="hover:text-[var(--color-foreground)]">Log in</Link>
            <Link href="/signup" className="hover:text-[var(--color-foreground)]">Sign up</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--color-border)] px-6 py-6 text-center text-xs text-[var(--color-foreground-subtle)]">
        © {new Date().getFullYear()} Watchtower. MIT Licensed. Built in the open.
      </div>
    </footer>
  );
}
