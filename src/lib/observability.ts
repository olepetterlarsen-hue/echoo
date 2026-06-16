/**
 * Tynn wrapper rundt Sentry. Hvis SENTRY_DSN ikke er satt blir alle
 * kallene no-ops — trygt å kalle fra både server actions og klient.
 *
 * Init skjer i instrumentation.ts (server-side) og sentry.client.config.ts.
 */

import * as Sentry from "@sentry/nextjs";

const hasDsn = !!(
  process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
);

export function captureException(
  e: unknown,
  context?: Record<string, unknown>,
): void {
  if (hasDsn) {
    Sentry.captureException(e, context ? { extra: context } : undefined);
  }
  // Også logg til stderr så Netlify/Vercel-loggene har det
  console.error("[capture]", e, context ?? "");
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
): void {
  if (hasDsn) {
    Sentry.captureMessage(message, level);
  }
}

export function setUser(
  user: { id?: string; email?: string } | null,
): void {
  if (hasDsn) {
    Sentry.setUser(user);
  }
}
