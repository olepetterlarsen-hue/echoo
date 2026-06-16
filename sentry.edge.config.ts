// Sentry-init for edge runtime (middleware, edge routes). Lastes fra
// src/instrumentation.ts når NEXT_RUNTIME === "edge".

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
