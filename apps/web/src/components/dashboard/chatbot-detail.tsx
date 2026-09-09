"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/alert";

interface DocumentDTO {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface MessageDTO {
  id: string;
  question: string;
  answer: string;
  citedDocumentIds: string[];
  createdAt: string;
}

export function ChatbotDetail({ chatbotId, canManage }: { chatbotId: string; canManage: boolean }) {
  const [documents, setDocuments] = useState<DocumentDTO[] | null>(null);
  const [messages, setMessages] = useState<MessageDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    const res = await fetch(`/api/chatbots/${chatbotId}/documents`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setDocuments(data.documents);
  }, [chatbotId]);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/chatbots/${chatbotId}/messages`);
    const data = await res.json();
    if (res.ok) setMessages(data.messages);
  }, [chatbotId]);

  useEffect(() => {
    loadDocs();
    loadMessages();
  }, [loadDocs, loadMessages]);

  async function addDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setFormError(null);
    const data = new FormData(form);
    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.get("title"), content: data.get("content") }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFormError(body.error ?? "Could not add document.");
        return;
      }
      form.reset();
      setShowForm(false);
      await loadDocs();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function removeDocument(id: string) {
    setBusyId(id);
    await fetch(`/api/chatbots/${chatbotId}/documents/${id}`, { method: "DELETE" });
    await loadDocs();
    setBusyId(null);
  }

  if (error) return <Alert tone="danger">{error}</Alert>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-foreground-subtle)]">KNOWLEDGE DOCUMENTS</h2>
          {canManage && !showForm && (
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              + Add document
            </Button>
          )}
        </div>

        {showForm && (
          <form onSubmit={addDocument} className="glass-card mb-4 flex flex-col gap-3 rounded-xl p-4">
            {formError && <Alert tone="danger">{formError}</Alert>}
            <div>
              <Label htmlFor="doc-title">Title</Label>
              <Input id="doc-title" name="title" required maxLength={200} placeholder="e.g. Refund policy" autoFocus />
            </div>
            <div>
              <Label htmlFor="doc-content">Content</Label>
              <textarea
                id="doc-content"
                name="content"
                required
                maxLength={10000}
                rows={6}
                placeholder="Paste the actual text the bot should know — a policy, an FAQ answer, a how-to."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-brand-violet)]"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending && <Spinner />}
                Add
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {!documents ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
            <Spinner /> Loading…
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-[var(--color-foreground-subtle)]">No documents yet — the bot can&apos;t answer anything until you add some.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documents.map((d) => (
              <li key={d.id} className="glass-card flex items-start justify-between gap-3 rounded-lg p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--color-foreground)]">{d.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-foreground-subtle)]">{d.content}</p>
                </div>
                {canManage && (
                  <Button variant="ghost" size="sm" onClick={() => removeDocument(d.id)} disabled={busyId === d.id}>
                    {busyId === d.id ? <Spinner /> : "Remove"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-foreground-subtle)]">RECENT CONVERSATIONS</h2>
        {!messages ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
            <Spinner /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[var(--color-foreground-subtle)]">No one has asked this bot anything yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li key={m.id} className="glass-card rounded-lg p-3 text-sm">
                <p className="font-medium text-[var(--color-foreground)]">Q: {m.question}</p>
                <p className="mt-1 text-[var(--color-foreground-muted)]">A: {m.answer}</p>
                <p className="mt-1 text-xs text-[var(--color-foreground-subtle)]">{new Date(m.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
