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

  // 2FA-policy: hvis org krever 2FA, må brukeren ha enrollet en verified
  // TOTP-faktor. /profil og /logout er alltid tilgjengelig så brukeren kan
  // enrolle / komme seg ut.
  const { data: org } = await supabase
    .from("organizations")
    .select("require_2fa")
    .eq("id", profile.organization_id)
    .single();

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

  const locale = await getLocale();

  return (
    <AppShell profile={profile} initialLocale={locale}>
      {children}
    </AppShell>
  );
}
