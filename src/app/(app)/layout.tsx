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

  const locale = await getLocale();

  return (
    <AppShell profile={profile} initialLocale={locale}>
      {children}
    </AppShell>
  );
}
