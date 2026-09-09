"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/alert";

export function ProfileForm({ initialName }: { initialName: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    const name = new FormData(form).get("name");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update your name.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <dd>{initialName ?? "—"}</dd>
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-[var(--color-link)] hover:underline">
          Edit
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="flex items-center gap-2">
        <Input name="name" defaultValue={initialName ?? ""} required maxLength={100} autoFocus className="h-8 max-w-xs" />
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Spinner />}
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
