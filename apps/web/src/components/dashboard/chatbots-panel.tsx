"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Spinner } from "@/components/ui/alert";

interface ChatbotDTO {
  id: string;
  name: string;
  publicKey: string;
  documentCount: number;
  messageCount: number;
}

function widgetSnippetFor(chatbotId: string, publicKey: string, origin: string): string {
  return `<script>
(function () {
  var WT_CHATBOT_ID = "${chatbotId}";
  var WT_KEY = "${publicKey}";
  var WT_ENDPOINT = "${origin}/api/chat/" + WT_CHATBOT_ID;

  var button = document.createElement("button");
  button.textContent = "Chat with us";
  button.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:9999;padding:12px 18px;border-radius:24px;background:#6366F1;color:#fff;border:none;font-family:sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.2)";

  var box = document.createElement("div");
  box.style.cssText = "display:none;position:fixed;bottom:76px;right:20px;width:320px;max-height:420px;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.2);font-family:sans-serif;z-index:9999;flex-direction:column;overflow:hidden";
  box.innerHTML =
    '<div style="padding:12px;border-bottom:1px solid #eee;font-weight:600;font-size:14px;">Ask a question</div>' +
    '<div id="wt-log" style="flex:1;overflow-y:auto;padding:12px;font-size:13px;color:#111;max-height:280px;"></div>' +
    '<div style="display:flex;border-top:1px solid #eee;">' +
    '<input id="wt-input" placeholder="Type a question..." style="flex:1;border:none;padding:10px;font-size:13px;outline:none;" />' +
    '<button id="wt-send" style="border:none;background:#6366F1;color:#fff;padding:0 14px;cursor:pointer;">Send</button>' +
    "</div>";

  document.body.appendChild(button);
  document.body.appendChild(box);

  button.onclick = function () {
    box.style.display = box.style.display === "none" ? "flex" : "none";
  };

  var log = box.querySelector("#wt-log");
  var input = box.querySelector("#wt-input");
  var send = box.querySelector("#wt-send");

  function addLine(text, who) {
    var p = document.createElement("p");
    p.style.margin = "0 0 8px 0";
    p.style.fontWeight = who === "you" ? "600" : "400";
    p.textContent = (who === "you" ? "You: " : "Bot: ") + text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  }

  function ask() {
    var question = input.value.trim();
    if (!question) return;
    addLine(question, "you");
    input.value = "";
    fetch(WT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: WT_KEY, question: question }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) { addLine(data.answer || data.error || "Something went wrong.", "bot"); })
      .catch(function () { addLine("Network error — please try again.", "bot"); });
  }

  send.onclick = ask;
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") ask();
  });
})();
</script>`;
}

export function ChatbotsPanel({ organizationId, canManage, origin }: { organizationId: string; canManage: boolean; origin: string }) {
  const [chatbots, setChatbots] = useState<ChatbotDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orgs/${organizationId}/chatbots`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChatbots(data.chatbots);
    } catch {
      setError("Could not load chatbots.");
    }
  }, [organizationId]);

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
      const res = await fetch(`/api/orgs/${organizationId}/chatbots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Could not create chatbot.");
        return;
      }
      form.reset();
      setShowForm(false);
      await load();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this chatbot? Its knowledge documents and conversation history will be deleted too.")) return;
    setBusyId(id);
    await fetch(`/api/orgs/${organizationId}/chatbots/${id}`, { method: "DELETE" });
    await load();
    setBusyId(null);
  }

  function copySnippet(id: string, snippet: string) {
    navigator.clipboard?.writeText(snippet).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  if (error) return <Alert tone="danger">{error}</Alert>;

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          {showForm ? (
            <form onSubmit={create} className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
              {formError && (
                <div className="sm:w-full">
                  <Alert tone="danger">{formError}</Alert>
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor="chatbot-name">Chatbot name</Label>
                <Input id="chatbot-name" name="name" required maxLength={60} autoFocus placeholder="e.g. support bot, docs assistant" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending}>
                  {pending && <Spinner />}
                  Create
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              + New chatbot
            </Button>
          )}
        </div>
      )}

      {!chatbots ? (
        <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
          <Spinner /> Loading chatbots…
        </div>
      ) : chatbots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-8 text-center text-sm text-[var(--color-foreground-muted)]">
          No chatbots yet. Create one, add a few knowledge documents, and drop the widget snippet into your site.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {chatbots.map((c) => {
            const snippet = widgetSnippetFor(c.id, c.publicKey, origin);
            const isExpanded = expandedId === c.id;
            return (
              <li key={c.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/dashboard/orgs/${organizationId}/chatbots/${c.id}`} className="min-w-0 hover:opacity-80">
                    <p className="truncate font-medium text-[var(--color-foreground)]">{c.name}</p>
                    <p className="text-xs text-[var(--color-foreground-subtle)]">
                      {c.documentCount} document{c.documentCount === 1 ? "" : "s"} · {c.messageCount} question{c.messageCount === 1 ? "" : "s"} asked
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    {c.documentCount === 0 && <Badge tone="warning">no knowledge yet</Badge>}
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                      {isExpanded ? "Hide widget" : "Get widget"}
                    </Button>
                    {canManage && (
                      <Button variant="ghost" size="sm" onClick={() => remove(c.id)} disabled={busyId === c.id}>
                        {busyId === c.id ? <Spinner /> : "Delete"}
                      </Button>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                    <p className="mb-2 text-xs text-[var(--color-foreground-muted)]">
                      Paste this before the closing <code className="text-[11px]">&lt;/body&gt;</code> tag of the site you want the chat widget on:
                    </p>
                    <pre className="max-h-64 overflow-auto rounded-lg bg-[#0F172A] p-3 text-[11px] leading-relaxed text-slate-100">
                      <code>{snippet}</code>
                    </pre>
                    <div className="mt-2">
                      <Button size="sm" variant="outline" onClick={() => copySnippet(c.id, snippet)}>
                        {copiedId === c.id ? "Copied!" : "Copy widget code"}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
