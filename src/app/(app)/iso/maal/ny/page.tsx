import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { ObjectiveForm } from "../objective-form";

export default async function NyMaalPage() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("organization_id", orgId)
    .eq("active", true)
    .order("full_name");

  return (
    <div className="px-6 py-6 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Nytt mål</h1>
        <p className="text-text-2 text-sm">
          Definer et kvalitets- eller miljømål med målbar verdi og frist.
        </p>
      </header>
      <ObjectiveForm
        profiles={profiles ?? []}
      />
    </div>
  );
}
