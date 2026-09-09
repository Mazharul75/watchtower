import Link from "next/link";
import { LogoWordmark } from "@watchtower/ui";
import { auth } from "@/auth";
import { ButtonLink } from "@/components/ui/button";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Watchtower home">
          <LogoWordmark size={18} />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-[var(--color-foreground-muted)] md:flex">
          <Link href="/#features" className="hover:text-[var(--color-foreground)]">Features</Link>
          <Link href="/#how-it-works" className="hover:text-[var(--color-foreground)]">How it works</Link>
          <Link href="/#faq" className="hover:text-[var(--color-foreground)]">FAQ</Link>
          <Link href="/#pricing" className="hover:text-[var(--color-foreground)]">Pricing</Link>
        </nav>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <ButtonLink href="/dashboard" size="sm">Go to dashboard</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">Log in</ButtonLink>
              <ButtonLink href="/signup" size="sm">Get started free</ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
