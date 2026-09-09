"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// global-error.tsx replaces the ENTIRE root layout when an error escapes it
// (e.g. a crash inside layout.tsx itself), so it must render a complete
// <html>/<body> — Next.js requires this exact shape for this one file.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#fafaf8", color: "#14171c", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600 }}>Watchtower hit an unexpected error.</h1>
          <p style={{ marginTop: 8, color: "#475569" }}>This has been reported automatically.</p>
          <button
            onClick={reset}
            style={{ marginTop: 24, padding: "10px 20px", borderRadius: 10, background: "linear-gradient(115deg,#6366F1,#8B5CF6,#22D3EE)", color: "#14171c", fontWeight: 600, border: "none", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
