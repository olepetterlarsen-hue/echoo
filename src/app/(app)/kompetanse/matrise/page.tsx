import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { ELEVATED_ROLES, type UserRole } from "@/lib/types/database";
import { Card, CardBody } from "@/components/ui/card";
import { CourseMatrix } from "./course-matrix";

export default async function MatrisePage() {
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

  const [
    { data: profiles },
    { data: courses },
    { data: certificates },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, hms_card_number, phone, email")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("required_courses")
      .select("id, name, category, validity_months, order_index")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("order_index"),
    supabase
      .from("certificates")
      .select(
        "id, profile_id, required_course_id, name, issued_date, expires_date",
      )
      .eq("organization_id", orgId),
  ]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Kursmatrise</h1>
        <p className="text-text-2 text-sm">
          Status per ansatt × påkrevd kurs. Klikk en celle for å se sertifikat-
          detaljer.
        </p>
      </header>

      {courses?.length === 0 ? (
        <Card>
          <CardBody className="text-center text-text-3 text-sm py-8">
            Ingen påkrevde kurs definert ennå. Gå til{" "}
            <a
              href="/kompetanse/kurs-krav"
              className="text-orange hover:underline"
            >
              Påkrevde kurs
            </a>{" "}
            for å legge til.
          </CardBody>
        </Card>
      ) : profiles?.length === 0 ? (
        <Card>
          <CardBody className="text-center text-text-3 text-sm py-8">
            Ingen ansatte registrert.
          </CardBody>
        </Card>
      ) : (
        <CourseMatrix
          profiles={profiles ?? []}
          courses={courses ?? []}
          certificates={certificates ?? []}
        />
      )}
    </div>
  );
}
