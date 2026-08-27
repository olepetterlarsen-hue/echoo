import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

export type AdminGateDecision =
  | { action: "allow" }
  | { action: "forbidden" }
  | { action: "redirect"; to: string };

/**
 * Ren beslutningsfunksjon for A7/I-04, I-28, I-29 — ingen Next.js/Supabase-
 * avhengighet, så den kan enhetstestes uten å mocke request/response eller
 * en Supabase-klient. updateSession() under kaller denne og utfører selve
 * navigeringen/svaret.
 */
export function adminGateDecision(
  pathname: string,
  role: string | undefined,
): AdminGateDecision {
  if (!pathname.startsWith("/admin")) return { action: "allow" };
  if (role === "admin") return { action: "allow" };
  // Route handlers (ikke sider) skal svare 403, ikke redirecte — maskin-
  // klienten (nedlastingsknappen) forventer en HTTP-status, ikke en 3xx.
  if (pathname === "/admin/bulk-import/template") {
    return { action: "forbidden" };
  }
  return { action: "redirect", to: "/dashboard" };
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() kaster AuthApiError ("Invalid Refresh Token: Refresh Token Not
  // Found") når cookien peker på en refresh-token Supabase ikke lenger
  // kjenner igjen — f.eks. etter at en annen sesjon er signert ut globalt,
  // eller cookien er gammel/korrupt. Skal behandles som ikke innlogget, ikke
  // krasje requesten.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const { pathname } = request.nextUrl;

  // Ruter for innlogging/registrering. Innloggede brukere her sendes
  // til /dashboard (skal ikke se signup når de allerede har konto).
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth");

  // Ruter som alltid skal være offentlige uavhengig av auth — webhook
  // POSTes fra Stripe (uten cookie), statiske bilder fra Next, osv.
  const isPublicEndpoint =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(pathname);

  if (!user && !isAuthRoute && !isPublicEndpoint) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.delete("redirectTo");
    return NextResponse.redirect(url);
  }

  // A7/I-04, I-28, I-29: sentral rollesjekk for HELE /admin/*-prefikset.
  // Før dette var hver admin-side/action ansvarlig for å sjekke role ===
  // "admin" selv — noe som ga reelle hull: admin/import-wizard hadde INGEN
  // sjekk noe sted (enhver rolle kunne kjøre AI-import og skrive til
  // storage), GET /admin/bulk-import/template hadde ingen sjekk, og
  // admin/abonnement/page.tsx hadde ingen sjekk på selve siden (kun på
  // actionen). Kun ett ekstra DB-oppslag, og kun for /admin/*-requests.
  if (user && pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const decision = adminGateDecision(pathname, profile?.role);
    if (decision.action === "forbidden") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (decision.action === "redirect") {
      const url = request.nextUrl.clone();
      url.pathname = decision.to;
      return NextResponse.redirect(url);
    }
  }

  return response;
}
