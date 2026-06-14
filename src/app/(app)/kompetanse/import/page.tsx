import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { ELEVATED_ROLES, type UserRole } from "@/lib/types/database";
import { CertImportClient } from "./client";

export default async function CertImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!ELEVATED_ROLES.includes((me?.role ?? "elektriker") as UserRole)) {
    redirect("/kompetanse");
  }

  const orgId = await getCurrentOrgId(supabase);

  const [{ data: profiles }, { data: courses }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("required_courses")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("order_index"),
  ]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Importer kursbevis</h1>
        <p className="text-text-2 text-sm">
          Last opp PDF-versjoner av kursbevisene. AI ekstraherer kursnavn,
          person, datoer og foreslår kobling mot påkrevde kurs og ansatte.
        </p>
      </header>
      <CertImportClient
        profiles={profiles ?? []}
        courses={courses ?? []}
      />
    </div>
  );
}
