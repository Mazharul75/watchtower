"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { LogoWordmark } from "@watchtower/ui";
import { Button, ButtonLink } from "@/components/ui/button";
import { AmbientBackground } from "@/components/site/background";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <AmbientBackground />
      <div className="mb-8">
        <LogoWordmark size={20} />
      </div>
      <p className="text-brand-gradient text-7xl font-bold">500</p>
      <h1 className="mt-4 text-2xl font-semibold">Something went wrong on our end.</h1>
      <p className="mt-2 max-w-sm text-[var(--color-foreground-muted)]">
        This has been reported automatically. Try again, or head back home.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-[var(--color-foreground-subtle)]">Error ID: {error.digest}</p>}
      <div className="mt-8 flex gap-4">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="outline">Back home</ButtonLink>
      </div>
    </div>
  );
}
