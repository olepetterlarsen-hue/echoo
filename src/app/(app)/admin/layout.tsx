import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin-routes har strengere 2FA-krav: hvis brukeren har enrollet en
 * verified TOTP-faktor, må sesjonen være aal2 før de får se admin-sider.
 * Hvis de ikke har enrollet noen faktor får de fortsette (org-policy
 * styrer obligatorisk enrollment).
 *
 * Vi kan ikke "step up" automatisk her — Supabase mfa-challenge må
 * trigges fra klient. Vi sender derfor brukeren tilbake til login med
 * en melding om at de må re-autentisere.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const [{ data: factors }, { data: aal }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  const hasVerified =
    (factors?.totp?.some((f) => f.status === "verified")) ?? false;

  // Bare gate hvis brukeren faktisk har en TOTP-faktor — ellers ville vi
  // tvunget enrollment som ikke er det vi vil her (det er org-policy sin
  // jobb). Når faktoren finnes må sesjonen være aal2.
  if (hasVerified && aal?.currentLevel !== "aal2") {
    await supabase.auth.signOut();
    redirect(
      "/login?error=Admin-sider+krever+2FA-bekreftelse.+Logg+inn+p%C3%A5+nytt.",
    );
  }

  return <>{children}</>;
}
