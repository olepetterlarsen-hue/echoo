// Next.js 16 instrumentation entry point.
// Lastes én gang per runtime — vi bruker det til å initialisere Sentry
// hvis pakka er installert og SENTRY_DSN er satt.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const dsn = process.env.SENTRY_DSN;
      if (!dsn) return;
      // Skjul spesifikatoren fra Turbopack static analysis — uten dette
      // feiler bundleren med "Module not found" når pakka ikke er installert
      // (Sentry er opt-in).
      const dyn = new Function("m", "return import(m)") as (
        m: string,
      ) => Promise<{ init?: (o: Record<string, unknown>) => void }>;
      const Sentry = await dyn("@sentry/nextjs");
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
