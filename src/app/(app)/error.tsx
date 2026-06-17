"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ChevronLeft } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

/**
 * Error-boundary for hele (app)-segmentet. Når en client-side render-feil
 * inntreffer (f.eks. i document-editor for risikovurdering), fanges den
 * her istedet for å gi den generiske Next.js-feilsiden.
 *
 * Stack-tracen sendes til Sentry og vises i klartekst for innloggede
 * brukere så feilrapporter kan inkludere konkret info istedet for "noe
 * krasjet".
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send til Sentry — fanger client-side krasj som ellers ville vært stille
    Sentry.captureException(error, {
      tags: { boundary: "app-segment" },
    });
  }, [error]);

  return (
    <div className="px-6 py-12 max-w-2xl mx-auto">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center size-16 rounded-full bg-red/15 text-red mx-auto">
          <AlertTriangle className="size-8" />
        </div>
        <h1 className="text-2xl font-semibold">Noe gikk galt</h1>
        <p className="text-text-2">
          Echoo-appen feilet ved rendering av denne siden. Feilen er rapportert
          automatisk så vi kan undersøke. Du kan trygt forsøke å gå tilbake
          eller laste siden på nytt — dataene dine er ikke borte.
        </p>
      </div>

      <div className="mt-8 flex justify-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-md bg-orange text-bg text-sm font-medium hover:bg-orange/90"
        >
          <RefreshCw className="size-4" />
          Prøv igjen
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-md bg-card text-text-1 text-sm font-medium border border-border hover:bg-card-hover"
        >
          <ChevronLeft className="size-4" />
          Til dashbordet
        </Link>
      </div>

      {/* Tekniske detaljer vises kollapset så brukere kan kopiere stack
          i feilrapport hvis problemet vedvarer */}
      <details className="mt-8 text-xs text-text-3 max-w-full">
        <summary className="cursor-pointer hover:text-text-2">
          Tekniske detaljer (for feilrapport)
        </summary>
        <div className="mt-2 p-3 rounded bg-card border border-border space-y-2">
          <div>
            <span className="font-medium text-text-2">Melding:</span>{" "}
            <code className="break-all">{error.message}</code>
          </div>
          {error.digest && (
            <div>
              <span className="font-medium text-text-2">Digest:</span>{" "}
              <code>{error.digest}</code>
            </div>
          )}
          {error.stack && (
            <details className="mt-1">
              <summary className="cursor-pointer hover:text-text-2">
                Stack-trace
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-all text-[10px] font-mono leading-tight">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </details>
    </div>
  );
}
