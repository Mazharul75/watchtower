import { LogoWordmark } from "@watchtower/ui";
import { ButtonLink } from "@/components/ui/button";
import { AmbientBackground } from "@/components/site/background";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <AmbientBackground />
      <div className="mb-8">
        <LogoWordmark size={20} />
      </div>
      <p className="text-brand-gradient text-7xl font-bold">404</p>
      <h1 className="mt-4 text-2xl font-semibold">This page isn&apos;t being watched.</h1>
      <p className="mt-2 max-w-sm text-[var(--color-foreground-muted)]">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-8 flex gap-4">
        <ButtonLink href="/">Back home</ButtonLink>
        <ButtonLink href="/dashboard" variant="outline">Go to dashboard</ButtonLink>
      </div>
    </div>
  );
}
