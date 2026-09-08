"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/alert";

export function ImpersonationBanner({ name, email }: { name: string | null; email: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function stopImpersonating() {
    setPending(true);
    try {
      await fetch("/api/admin/impersonate/stop", { method: "POST" });
      router.push("/admin");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-[var(--color-warning)]/15 px-6 py-2.5 text-sm text-[#FCD34D]">
      <span>
        You are viewing Watchtower as <strong>{name ?? email}</strong>. This session is logged and expires
        automatically after 1 hour.
      </span>
      <Button variant="outline" size="sm" onClick={stopImpersonating} disabled={pending}>
        {pending && <Spinner />}
        Exit impersonation
      </Button>
    </div>
  );
}
