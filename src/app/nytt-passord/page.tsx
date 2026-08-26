import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { NyttPassordForm } from "./nytt-passord-form";

/**
 * Forced passordbytte-side for brukere opprettet av admin med et
 * midlertidig passord (must_change_password). Ligger utenfor (app)/ for å
 * unngå redirect-loop — samme mønster som /mfa-setup.
 */
export default async function NyttPassordPage() {
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

  // Allerede byttet (eller aldri påkrevd) — ingenting å gjøre her.
  if (!profile?.must_change_password) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-semibold">Bytt passord</h1>
          <p className="text-text-2 text-sm mt-1">
            Du logget inn med et midlertidig passord. Velg et nytt passord
            for å fortsette.
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
