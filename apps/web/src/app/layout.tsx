import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Watchtower — AI engineering memory for GitHub repos",
    template: "%s · Watchtower",
  },
  description:
    "Watchtower connects to your GitHub repo, builds a living engineering graph from your real history, and gives every incident a cited root-cause analysis with a human approval gate before any fix ships.",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the nonce here (even though we don't use the value ourselves)
  // is what tells Next.js's renderer to stamp this same nonce onto every
  // script/style tag IT injects for this request — without this read,
  // Next has no way to know a nonce-based CSP is in play, so its own
  // scripts get emitted without one and the browser blocks them outright.
  // See proxy.ts for where x-nonce and the matching CSP header are set.
  const nonce = (await headers()).get("x-nonce");

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body data-csp-nonce={nonce ?? undefined}>{children}</body>
    </html>
  );
}
