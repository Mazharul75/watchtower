import Link from "next/link";
import { LogoWordmark } from "@watchtower/ui";
import { AmbientBackground } from "@/components/site/background";
import { Card } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <AmbientBackground />
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <LogoWordmark size={20} />
          </Link>
        </div>
        <Card className="p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-[var(--color-foreground)]">{title}</h1>
            {description && <p className="mt-2 text-sm text-[var(--color-foreground-muted)]">{description}</p>}
          </div>
          {children}
        </Card>
        {footer && <p className="mt-6 text-center text-sm text-[var(--color-foreground-muted)]">{footer}</p>}
      </div>
    </div>
  );
}
