// Next.js 16 instrumentation entry point.
// Initialiserer Sentry hvis SENTRY_DSN er satt.

import * as Sentry from "@sentry/nextjs";

export function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: 0.1,
      // Echoo håndterer norsk persondata — vi vil ikke at PII skal lekke
      sendDefaultPii: false,
    });
  } else if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
