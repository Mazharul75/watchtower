import * as Sentry from "@sentry/nextjs";

// No DSN configured -> Sentry SDK silently no-ops; nothing breaks locally or
// in CI. Set NEXT_PUBLIC_SENTRY_DSN in production to start receiving events.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  environment: process.env.NODE_ENV,
});

// Required so the SDK can instrument App Router client-side navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
