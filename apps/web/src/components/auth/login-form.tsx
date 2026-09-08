"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAction, type FormActionState } from "@/app/actions/auth-actions";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Spinner } from "@/components/ui/alert";
import { OAuthButtons } from "./oauth-buttons";

const initialState: FormActionState = { error: null, success: false };

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState(loginAction, initialState);

  useEffect(() => {
    if (state.success) {
      // A fresh client-initiated navigation, not a server-side redirect —
      // see loginAction's comment for why that distinction matters here.
      router.push(callbackUrl);
      router.refresh();
    }
  }, [state.success, callbackUrl, router]);

  if (state.success) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--color-foreground-muted)]">
        <Spinner /> Signing you in…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <OAuthButtons callbackUrl={callbackUrl} />

      <div className="flex items-center gap-3 text-xs text-[var(--color-foreground-subtle)]">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        OR
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {state.error && <Alert tone="danger">{state.error}</Alert>}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="mb-1.5 text-xs text-[var(--color-brand-cyan)] hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••••" />
        </div>

        <SubmitButton>Log in</SubmitButton>
      </form>
    </div>
  );
}
