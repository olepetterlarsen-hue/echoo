import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { NyttPassordForm } from "./nytt-passord-form";

interface PageProps {
  searchParams: Promise<{ recovery?: string }>;
}

/**
 * Passordbytte-side, brukt i to sammenhenger: (1) tvungen bytte for
 * brukere opprettet av admin med et midlertidig passord
 * (must_change_password), (2) selvbetjent glemt-passord/reset-lenke
 * (?recovery=1 - satt av redirectTo i requestPasswordReset/admin-reset/
 * ansatt-signering, se login/actions.ts). Uten (2) logget en reset-lenke
 * brukeren bare rett inn på /profil uten noen gang å be dem sette et nytt
 * passord - reset-en virket dermed "ubrukelig". Ligger utenfor (app)/ for
 * å unngå redirect-loop - samme mønster som /mfa-setup.
 */
export default async function NyttPassordPage({ searchParams }: PageProps) {
  const { recovery } = await searchParams;
  const isRecovery = recovery === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("id", user.id)
    .single();

  // Verken tvungen bytte påkrevd, eller kom hit via en reset-lenke —
  // ingenting å gjøre her.
  if (!profile?.must_change_password && !isRecovery) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-semibold">Bytt passord</h1>
          <p className="text-text-2 text-sm mt-1">
            {isRecovery
              ? "Velg et nytt passord for kontoen din."
              : "Du logget inn med et midlertidig passord. Velg et nytt passord for å fortsette."}
          </p>
        </header>
        <Card>
          <CardBody>
            <NyttPassordForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
