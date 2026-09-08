"use client";

import { useState, type FormEvent } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/alert";

export function ResendVerificationForm({ defaultEmail }: { defaultEmail?: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const email = new FormData(event.currentTarget).get("email");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message ?? "If that account exists, a new link is on its way.");
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {message && <Alert tone="info">{message}</Alert>}
      <div>
        <Label htmlFor="resend-email">Resend verification link to</Label>
        <Input id="resend-email" name="email" type="email" required defaultValue={defaultEmail} placeholder="you@example.com" />
      </div>
      <Button type="submit" variant="secondary" disabled={pending} className="w-full">
        {pending && <Spinner />}
        {pending ? "Sending…" : "Resend verification email"}
      </Button>
    </form>
  );
}
