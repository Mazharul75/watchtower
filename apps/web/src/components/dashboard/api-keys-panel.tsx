"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Spinner } from "@/components/ui/alert";

interface ApiKeyDTO {
  id: string;
  name: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/account/api-keys");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKeys(data.keys);
    } catch {
      setError("Could not load API keys.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setFormError(null);
    const name = new FormData(form).get("name");
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Could not create key.");
        return;
      }
      form.reset();
      setShowForm(false);
      setNewKey(data.key);
      await load();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function revoke(id: string) {
    setBusyId(id);
    await fetch(`/api/account/api-keys/${id}`, { method: "DELETE" });
    await load();
    setBusyId(null);
  }

  if (error) return <Alert tone="danger">{error}</Alert>;

  return (
    <div className="flex flex-col gap-4">
      {newKey && (
        <Alert tone="success">
          <div className="flex flex-col gap-2">
            <p className="font-medium">Copy this key now — you won&apos;t be able to see it again.</p>
            <code className="block overflow-x-auto rounded-lg bg-[#0F172A] px-3 py-2 font-mono text-xs text-slate-100">{newKey}</code>
            <div>
              <Button size="sm" variant="secondary" onClick={() => setNewKey(null)}>
                Done, I copied it
              </Button>
            </div>
          </div>
        </Alert>
      )}

      <div className="flex justify-end">
        {showForm ? (
          <form onSubmit={create} className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
            {formError && (
              <div className="sm:w-full">
                <Alert tone="danger">{formError}</Alert>
              </div>
            )}
            <div className="flex-1">
              <Label htmlFor="key-name">Name</Label>
              <Input id="key-name" name="name" required maxLength={60} autoFocus placeholder="e.g. laptop CI, deploy script" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending && <Spinner />}
                Generate
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            + Generate a key
          </Button>
        )}
      </div>

      {!keys ? (
        <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
          <Spinner /> Loading keys…
        </div>
      ) : keys.length === 0 ? (
        <p className="text-sm text-[var(--color-foreground-subtle)]">
          No API keys yet. Generate one to call the Watchtower API (apps/api) from a script or CI job with an{" "}
          <code className="text-xs">Authorization: Bearer &lt;key&gt;</code> header.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="flex items-center gap-2 font-medium text-[var(--color-foreground)]">
                  {k.name}
                  {k.revokedAt && <Badge tone="danger">revoked</Badge>}
                </p>
                <p className="text-xs text-[var(--color-foreground-subtle)]">
                  Created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleString()}` : " · never used"}
                </p>
              </div>
              {!k.revokedAt && (
                <Button variant="ghost" size="sm" onClick={() => revoke(k.id)} disabled={busyId === k.id}>
                  {busyId === k.id ? <Spinner /> : "Revoke"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
