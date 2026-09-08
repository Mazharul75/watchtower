import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@watchtower/ui"],
  // Next.js 16 no longer exposes an `eslint` build option — CI runs
  // `npm run lint` as its own explicit step instead.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Content-Security-Policy is set per-request (with a nonce) in
          // proxy.ts instead of here, because static headers() can't
          // vary per request — see proxy.ts for the real policy.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

// Sentry wraps the build to upload source maps when SENTRY_AUTH_TOKEN is set;
// it's a no-op locally / in CI without that token, so this never blocks a build.
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  telemetry: false,
});
