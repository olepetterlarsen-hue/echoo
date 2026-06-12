import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { AspectForm } from "./aspect-form";

export default async function NyAspektPage() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);

  const [{ data: profiles }, { data: substances }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("substances")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("name"),
  ]);

  return (
    <div className="px-6 py-6 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Nytt miljøaspekt</h1>
        <p className="text-text-2 text-sm">
          Frekvens × alvorlighet (1–5 hver) gir significance score.
          Score ≥ 12 anses normalt som signifikant.
        </p>
      </header>
      <AspectForm
        profiles={profiles ?? []}
        substances={substances ?? []}
      />
    </div>
  );
}
