import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — refresh handled by proxy.
          }
        },
      },
    },
  );
}

export async function createAdminClient() {
  // Eksplisitt sjekk så vi får tydelig feilmelding hvis env-varen mangler i
  // prod (Netlify). Uten denne ville Supabase-klienten bli initialisert med
  // undefined, og alle queries returnerer stille tomme resultater — som tar
  // timesvis å feilsøke.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL mangler. Sjekk Netlify Environment variables.",
    );
  }
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY mangler. Sjekk Netlify Environment variables.",
    );
  }
  // KRITISK: ikke videreformidle brukerens cookies. Når en innlogget bruker
  // har en sb-access-token-cookie og vi sender den til Supabase sammen med
  // service-role-nøkkelen, evaluerer Supabase RLS som om brukeren er auth'et
  // — service-role-bypassen forsvinner. Det førte til at /team-dashbordet
  // bare viste data fra Ole Petters egen OPCOM-org i stedet for cross-tenant.
  // Returner tom cookies-array så klienten kjører ren service-role.
  return createServerClient<Database>(
    url,
    serviceKey,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Admin client doesn't manage user sessions.
        },
      },
    },
  );
}
