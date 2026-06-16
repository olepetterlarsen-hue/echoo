// Sentry-init for Node.js server runtime. Lastes fra src/instrumentation.ts
// når NEXT_RUNTIME === "nodejs".

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
    // Echoo håndterer norsk persondata — ikke automatisk fang PII
    sendDefaultPii: false,
  });
}
