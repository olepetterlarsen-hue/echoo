import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  FolderOpen,
  Users,
  Calendar,
  GraduationCap,
  Sparkles,
} from "lucide-react";

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) redirect("/dashboard");

  const { data: org } = await supabase
    .from("organizations")
    .select("firma")
    .eq("id", profile.organization_id)
    .single();

  const firstName = profile.full_name?.split(" ")[0] ?? "";

  return (
    <div className="px-6 py-12 max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center size-16 rounded-full bg-green/15 text-green">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="text-3xl font-semibold">
          {firstName
            ? `Gratulerer, ${firstName} — du er nå på Echoo!`
            : "Gratulerer — du er nå på Echoo!"}
        </h1>
        <p className="text-text-2">
          Takk for at {org?.firma ? `${org.firma}` : "dere"} valgte oss. Vi
          håper og tror Echoo skal gjøre like stor nytte for dere som det har
          gjort for oss — og vi hører gjerne fra dere hvis noe kan bli bedre.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="size-5 text-orange" />
            Kom raskt i gang
          </h2>
          <p className="text-sm text-text-2">
            Her er de fire stegene som gir best fart i starten. Du kan ta dem
            i hvilken som helst rekkefølge — eller hoppe rett til dashbordet
            hvis du heller vil utforske selv.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <StepCard
              href="/admin/brukere"
              icon={<Users className="size-5" />}
              title="Inviter kollegaene"
              body="Ubegrenset antall brukere på samme abonnement."
            />
            <StepCard
              href="/kunder/ny"
              icon={<FolderOpen className="size-5" />}
              title="Registrer første kunde"
              body="Eller importer eksisterende kundeliste via /admin/bulk-import."
            />
            <StepCard
              href="/prosjekter/ny"
              icon={<Calendar className="size-5" />}
              title="Opprett et prosjekt"
              body="Få oversikt over fremdrift, dokumenter og avvik på ett sted."
            />
            <StepCard
              href="/kompetanse"
              icon={<GraduationCap className="size-5" />}
              title="Legg inn kursbevis"
              body="Få automatisk varsel når sertifikater nærmer seg utløp."
            />
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <p className="text-sm text-text-3">
          Brukerstøtte: send oss en feilrapport via knappen nederst til høyre,
          eller mail support@echoo.no.
        </p>
        <Link href="/dashboard">
          <Button size="lg">Gå til dashbordet</Button>
        </Link>
      </div>
    </div>
  );
}

function StepCard({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-4 rounded-md border border-border hover:border-orange/40 hover:bg-card-hover transition-colors"
    >
      <div className="text-orange shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="font-medium text-text-1">{title}</div>
        <div className="text-xs text-text-3 mt-0.5">{body}</div>
      </div>
    </Link>
  );
}
