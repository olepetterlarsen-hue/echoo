// Sentry-init for browser/klient. Kjøres av Next.js på sidens første load.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    integrations: [Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    // Session replay: kun ved errors (10% av feil-sessions), aldri proaktivt
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    // Echoo håndterer norsk persondata — ikke automatisk fang PII
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
