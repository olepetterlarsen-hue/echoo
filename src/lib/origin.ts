import { headers } from "next/headers";

/**
 * Resolverer riktig app-origin for redirects, e-postlenker og
 * Stripe success/cancel-URLer. Prioritert rekkefølge:
 *
 *  1. NEXT_PUBLIC_APP_URL (sett i Netlify til https://echoo.no o.l.)
 *  2. Origin fra request — http for localhost, https for alt annet.
 *
 * Filtrerer ut Netlify secrets-scanning-masken "****" som tidvis dukker
 * opp før env-en er settled. Returnerer alltid uten trailing slash.
 */
export async function getAppOrigin(): Promise<string> {
  const envValue = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envValue && envValue !== "****" && !envValue.includes("****")) {
    try {
      // Valider — kaster hvis ikke en gyldig URL
      const u = new URL(envValue);
      return `${u.protocol}//${u.host}`;
    } catch {
      // ugyldig — fall gjennom
    }
  }
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  // Tillat http kun for localhost-utvikling. I prod skal dette aldri
  // skje siden NEXT_PUBLIC_APP_URL er satt.
  const isLocal = /^localhost(:\d+)?$/i.test(host) || /^127\.0\.0\.1/i.test(host);
  const proto = isLocal ? "http" : "https";
  // Sjekk om proxy har satt x-forwarded-proto eksplisitt
  const fwdProto = h.get("x-forwarded-proto");
  if (fwdProto && /^https?$/.test(fwdProto)) {
    return `${fwdProto}://${host}`;
  }
  return `${proto}://${host}`;
}
