import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/app-shell";
import { getLocale } from "@/lib/i18n/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    redirect("/login?error=Kontoen+er+deaktivert.+Kontakt+administrator.");
  }

  // Brukeren _må_ tilhøre en organisasjon. Uten organization_id vil RLS
  // skjule alle data og inserts feile — bedre å logge ut og vise feilmelding.
  if (!profile.organization_id) {
    await supabase.auth.signOut();
    redirect(
      "/login?error=Kontoen+mangler+organisasjon.+Kontakt+administrator+for+invitasjon.",
    );
  }

  // A6/I-01: admin kan opprette brukere med et midlertidig passord — de skal
  // ikke nå dashbordet før de har byttet det selv. /nytt-passord ligger
  // utenfor (app)-layouten (samme mønster som /mfa-setup) for å unngå
  // redirect-loop.
  if (profile.must_change_password) {
    redirect("/nytt-passord");
  }

  // Én org-query (2FA-policy + billing-lås) parallelt med locale-oppslag.
  const [{ data: org }, locale] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "require_2fa, locked_at, subscription_status, trial_ends_at, plan_tier",
      )
      .eq("id", profile.organization_id)
      .single(),
    getLocale(),
  ]);

  // 2FA-policy: hvis org krever 2FA, må brukeren ha enrollet en verified
  // TOTP-faktor. /profil og /logout er alltid tilgjengelig så brukeren kan
  // enrolle / komme seg ut.
  if (org?.require_2fa) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasVerified =
      (factors?.totp?.some((f) => f.status === "verified")) ?? false;
    if (!hasVerified) {
      // /mfa-setup ligger utenfor (app)-layouten så vi unngår
      // redirect-loop. Brukeren kan enrolle der og sendes deretter
      // til dashboard.
      redirect("/mfa-setup");
    }
    // Selv om faktor finnes må sesjonen være aal2 (verifisert i denne login)
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") {
      await supabase.auth.signOut();
      redirect(
        "/login?error=Bedriften+krever+2FA.+Logg+inn+p%C3%A5+nytt+og+bekreft+med+kode.",
      );
    }
  }

  // Read-only / låst tilgang ved utløpt prøveperiode / forfalt betaling.
  // Vi REDIRECTER ikke — brukeren skal kunne se data + navigere til
  // abonnement-siden. Banner i AppShell varsler, og write-actions
  // sjekker selv via guardOrgWritable() (lib/billing.ts).
  // Server component — Date.now() er trygg her (kjører én gang per request).
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const locked = org
    ? !!org.locked_at ||
      ((org.subscription_status !== "active" &&
        org.subscription_status !== "trialing") &&
        org.trial_ends_at !== null &&
        new Date(org.trial_ends_at).getTime() < nowMs)
    : false;

  const isEchooStaff = profile.is_echoo_staff === true;
  // Tema fra profil — fallback til "lin" hvis kolonnen mangler (før migration 062)
  const profileTheme = (profile as { theme_preference?: "lin" | "dark" })
    .theme_preference;
  const initialTheme: "lin" | "dark" = profileTheme === "dark" ? "dark" : "lin";

  return (
    <AppShell
      profile={profile}
      initialLocale={locale}
      initialTheme={initialTheme}
      locked={locked}
      isEchooStaff={isEchooStaff}
    >
      {children}
    </AppShell>
  );
}
