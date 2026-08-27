import { NextResponse } from "next/server";

/**
 * Brukes av VersionWatcher (klient) til å oppdage at en ny utrulling har
 * skjedd mens fanen har vært åpen — f.eks. etter en nattlig
 * agent-drevet fiks i vedlikeholdsvinduet (01–04). VERCEL_GIT_COMMIT_SHA
 * settes automatisk av Vercel ved hver deploy; lokalt/dev faller den
 * tilbake til "dev" (alltid lik, så watcheren aldri varsler i dev).
 */
export async function GET() {
  const buildId = process.env.VERCEL_GIT_COMMIT_SHA ?? "dev";
  return NextResponse.json(
    { buildId },
    { headers: { "Cache-Control": "no-store" } },
  );
}
