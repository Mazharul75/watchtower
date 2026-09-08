"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/alert";

export function CreateOrgForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Capture the form element synchronously — React 19 (like 17+) nulls
    // out the native event's `currentTarget` once the handler's synchronous
    // portion finishes, so reading `event.currentTarget` after an `await`
    // throws. Grabbing a reference up front avoids that.
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    const name = new FormData(form).get("name");
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create organization.");
        return;
      }
      form.reset();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + New organization
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      {error && (
        <div className="sm:w-full">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
      <div className="flex-1">
        <Label htmlFor="org-name">Organization name</Label>
        <Input id="org-name" name="name" required minLength={2} maxLength={64} autoFocus placeholder="Acme Corp" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          Create
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
