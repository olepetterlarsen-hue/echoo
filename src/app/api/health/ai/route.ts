/**
 * /api/health/ai
 *
 * Minimal helsesjekk mot Anthropic — brukes av import-wizarden (klient) for
 * å skjule/merke AI-knappene FØR opplasting, og kan pinges av deploy-
 * pipelinen som en smoke-test etter utrulling.
 *
 * Ikke autentisert (kalles fra innloggede brukeres nettleser). Selve
 * sjekken caches kort i minnet, se src/lib/ai/health.ts.
 */
import { NextResponse } from "next/server";
import { checkAiHealthCached } from "@/lib/ai/health";

export const runtime = "nodejs";

export async function GET() {
  const ok = await checkAiHealthCached();
  return NextResponse.json({ ok });
}
