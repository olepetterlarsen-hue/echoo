import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { ELEVATED_ROLES, type UserRole } from "@/lib/types/database";
import { RequiredCoursesAdmin } from "./required-courses-admin";

export default async function KursKravPage() {
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
  const role = (me?.role ?? "elektriker") as UserRole;
  if (!ELEVATED_ROLES.includes(role) || me?.role !== "admin") {
    redirect("/kompetanse");
  }

  const orgId = await getCurrentOrgId(supabase);
  const { data: courses } = await supabase
    .from("required_courses")
    .select("*")
    .eq("organization_id", orgId)
    .order("order_index");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Påkrevde kurs</h1>
        <p className="text-text-2 text-sm">
          Definer hvilke kurs bedriften krever av sine ansatte. Sertifikater
          kobles til kursene via opplastning eller AI-import, og matrisen
          viser status per ansatt.
        </p>
      </header>
      <RequiredCoursesAdmin courses={courses ?? []} />
    </div>
  );
}
