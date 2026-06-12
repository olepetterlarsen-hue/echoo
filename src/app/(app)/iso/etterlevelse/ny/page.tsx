import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { ComplianceForm } from "./compliance-form";

export default async function NyEtterlevelsePage() {
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
        <h1 className="text-2xl font-semibold">Ny forpliktelse</h1>
        <p className="text-text-2 text-sm">
          Lov, forskrift eller standard som virksomheten må etterleve.
        </p>
      </header>
      <ComplianceForm profiles={profiles ?? []} />
    </div>
  );
}
