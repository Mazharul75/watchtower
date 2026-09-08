import { signOutAction } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";

export function Topbar({ name, email }: { name: string | null; email: string | null }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-foreground)]">{name ?? email}</p>
        {name && <p className="text-xs text-[var(--color-foreground-subtle)]">{email}</p>}
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm">Sign out</Button>
      </form>
    </header>
  );
}
