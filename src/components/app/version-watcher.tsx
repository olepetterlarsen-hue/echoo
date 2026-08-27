"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";

const POLL_MS = 5 * 60 * 1000; // 5 min — nok til å fange en ny deploy uten å spamme

async function fetchBuildId(): Promise<string | null> {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { buildId: string };
    return data.buildId;
  } catch {
    return null;
  }
}

/**
 * Oppdager at en ny versjon er utrullet mens fanen har vært åpen (typisk
 * etter en nattlig agent-fiks i vedlikeholdsvinduet 01–04) og ber brukeren
 * laste siden på nytt. "Senere" skjuler varselet til neste sjekk — ikke en
 * permanent avvisning, siden gamle JS-chunks til slutt kan gi
 * ChunkLoadError likevel (se src/lib/chunk-error.ts for den reaktive siden).
 */
export function VersionWatcher() {
  const initialBuildId = useRef<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, showPrompt);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    fetchBuildId().then((id) => {
      if (cancelled || !id) return;
      initialBuildId.current = id;
      interval = setInterval(async () => {
        const current = await fetchBuildId();
        if (
          current &&
          initialBuildId.current &&
          current !== initialBuildId.current
        ) {
          setShowPrompt(true);
        }
      }, POLL_MS);
    });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-bg/60 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-watcher-title"
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <div className="inline-flex items-center justify-center size-9 rounded-full bg-orange/15 text-orange shrink-0">
            <RefreshCw className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="version-watcher-title" className="text-sm font-semibold text-text-1">
              Ny versjon er tilgjengelig
            </h2>
            <p className="text-sm text-text-2 mt-1">
              Echoo er oppdatert. Last siden på nytt for å ta i bruk de
              nyeste endringene.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={() => setShowPrompt(false)}>
            Senere
          </Button>
          <Button size="sm" onClick={() => window.location.reload()}>
            Last på nytt
          </Button>
        </div>
      </div>
    </div>
  );
}
