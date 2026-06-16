// Next.js 16 client-side instrumentation entry point.
// Initialiserer Sentry i nettleseren hvis NEXT_PUBLIC_SENTRY_DSN er satt.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
    // Echoo håndterer norsk persondata — ingen automatisk PII-fangst
    sendDefaultPii: false,
    // Lavere replay-frekvens i prod — vi vil bare ha det ved feil
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
