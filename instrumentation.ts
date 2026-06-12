// Next.js 16 instrumentation entry point.
// Lastes én gang per runtime — vi bruker det til å initialisere Sentry
// hvis pakka er installert og SENTRY_DSN er satt.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const dsn = process.env.SENTRY_DSN;
      if (!dsn) return;
      // @ts-expect-error - opt-in dependency
      const Sentry = await import("@sentry/nextjs");
      Sentry.init?.({
        dsn,
        environment: process.env.NODE_ENV ?? "development",
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
      });
    } catch {
      // pakka mangler — kjør videre uten observability
    }
  }
}
