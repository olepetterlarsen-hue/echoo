// TODO: fjern denne endpointen når oppsettet er bekreftet OK.
// Eksponerer kun NEXT_PUBLIC_*-verdier (som er ment offentlige uansett).
// Server-secrets vises som boolean (om de er satt eller ei).

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const encKey = process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY ?? "";

  return Response.json({
    NEXT_PUBLIC_SUPABASE_URL: {
      value: supabaseUrl,
      length: supabaseUrl.length,
      isValidUrl: /^https?:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl),
      isMasked: supabaseUrl === "****" || supabaseUrl.includes("****"),
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      length: anonKey.length,
      startsWithEy: anonKey.startsWith("ey"),
      isMasked: anonKey === "****" || anonKey.includes("****"),
    },
    NEXT_PUBLIC_APP_URL: {
      value: appUrl,
      length: appUrl.length,
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      present: serviceRole.length > 0,
      length: serviceRole.length,
      startsWithEy: serviceRole.startsWith("ey"),
    },
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: {
      present: encKey.length > 0,
      length: encKey.length,
    },
    nodeEnv: process.env.NODE_ENV,
  });
}
