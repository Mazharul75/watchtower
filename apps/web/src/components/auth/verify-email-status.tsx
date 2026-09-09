"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Spinner } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { ResendVerificationForm } from "./resend-verification-form";

type Status = "verifying" | "success" | "error";

export function VerifyEmailStatus({ token, email }: { token?: string; email?: string }) {
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string>("Verifying your email…");

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setMessage("This verification link is missing information. Request a new one below.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error ?? "Verification failed.");
          return;
        }
        setStatus("success");
        setMessage(data.message ?? "Email verified!");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Network error. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, email]);

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-[var(--color-foreground-muted)]">
        <Spinner className="h-6 w-6" />
        <p>{message}</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">{message}</Alert>
        <ButtonLink href="/login" className="w-full">
          Continue to log in
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Alert tone="danger">{message}</Alert>
      <ResendVerificationForm defaultEmail={email} />
      <p className="text-center text-sm text-[var(--color-foreground-muted)]">
        <Link href="/login" className="text-[var(--color-link)] underline underline-offset-2">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
