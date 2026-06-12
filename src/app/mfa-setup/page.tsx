import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { MfaSetupForm } from "./mfa-setup-form";

/**
 * Forced enrollment-side for orgs som krever 2FA. Brukeren har logget
 * inn, men har ikke en verified TOTP-faktor — uten denne får de ikke
 * tilgang. Vi serverer enrollment-formen i en frittstående layout for
 * å unngå redirect-loop i (app)/.
 */
export default async function MfaSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) {
    await supabase.auth.signOut();
    redirect("/login?error=Kontoen+mangler+organisasjon.");
  }

  const [{ data: org }, { data: factors }] = await Promise.all([
    supabase
      .from("organizations")
      .select("require_2fa, firma")
      .eq("id", profile.organization_id)
      .single(),
    supabase.auth.mfa.listFactors(),
  ]);

  const hasVerified =
    (factors?.totp?.some((f) => f.status === "verified")) ?? false;

  // Hvis 2FA ikke er påkrevd OG bruker allerede har verifisert → send til dashboard
  if (hasVerified || !org?.require_2fa) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-semibold">Aktiver 2FA</h1>
          <p className="text-text-2 text-sm mt-1">
            {org.firma} krever to-faktor-autentisering. Du må aktivere TOTP
            for å fortsette.
          </p>
        </header>
        <Card>
          <CardBody>
            <MfaSetupForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
