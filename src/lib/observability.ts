/**
 * Tynn wrapper rundt Sentry. Bruker dynamisk import slik at appen
 * fungerer uten at @sentry/nextjs er installert — Sentry er opt-in:
 *
 *   npm install @sentry/nextjs
 *   sett SENTRY_DSN i .env / Netlify
 *
 * Hvis SENTRY_DSN ikke er satt eller pakka mangler, er alle kallene
 * no-ops. Det betyr at vi kan kalle captureException/captureMessage
 * trygt fra både server actions og klient.
 */

type SentryLike = {
  init?: (options: Record<string, unknown>) => void;
  captureException?: (e: unknown, ctx?: Record<string, unknown>) => string | void;
  captureMessage?: (msg: string, level?: string) => string | void;
  setUser?: (user: { id?: string; email?: string } | null) => void;
};

let _sentry: SentryLike | null = null;
let _loaded = false;

async function load(): Promise<SentryLike | null> {
  if (_loaded) return _sentry;
  _loaded = true;
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;
  try {
    // @ts-expect-error - dynamisk import, pakka kan mangle
    const mod = await import("@sentry/nextjs");
    _sentry = mod as SentryLike;
    if (typeof _sentry.init === "function") {
      _sentry.init({
        dsn,
        environment: process.env.NODE_ENV ?? "development",
        tracesSampleRate: 0.1,
        // Echoo håndterer norsk persondata — vi vil ikke at PII skal lekke
        sendDefaultPii: false,
      });
    }
    return _sentry;
  } catch {
    return null;
  }
}

export async function captureException(
  e: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  const s = await load();
  s?.captureException?.(e, context);
  // Også logg til stderr så Netlify/Vercel-loggene har det
  console.error("[capture]", e, context ?? "");
}

export async function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
): Promise<void> {
  const s = await load();
  s?.captureMessage?.(message, level);
}

export async function setUser(user: {
  id?: string;
  email?: string;
} | null): Promise<void> {
  const s = await load();
  s?.setUser?.(user);
}
