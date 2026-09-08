"use client";

import { useState, type FormEvent } from "react";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner, Alert } from "@/components/ui/alert";
import { OAuthButtons } from "./oauth-buttons";

export function SignupForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Captured synchronously — see create-org-form.tsx's comment on why
    // `event.currentTarget` can't be read after an `await`.
    const form = event.currentTarget;
    setError(null);
    setSuccess(null);
    setPending(true);

    const formData = new FormData(form);
    const payload = {
      name: formData.get("name"),
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(data.message ?? "Check your email to verify your account.");
      form.reset();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return <Alert tone="success">{success}</Alert>;
  }

  return (
    <div className="flex flex-col gap-6">
      <OAuthButtons callbackUrl="/dashboard" />

      <div className="flex items-center gap-3 text-xs text-[var(--color-foreground-subtle)]">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        OR
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}

        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" required placeholder="Ada Lovelace" />
        </div>
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9_-]+" placeholder="ada" />
          <FieldError>Letters, numbers, hyphens and underscores only.</FieldError>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} placeholder="At least 10 characters" />
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending && <Spinner />}
          {pending ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-xs text-[var(--color-foreground-subtle)]">
          By signing up you agree to receive a verification email. We never share your data.
        </p>
      </form>
    </div>
  );
}
