import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { AuditPlanForm } from "./audit-plan-form";

export default async function NyRevisjonPage() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);

  const [{ data: profiles }, { data: templates }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("audit_checklist_templates")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="px-6 py-6 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Ny revisjon</h1>
        <p className="text-text-2 text-sm">
          Planlegg en intern revisjon med scope, auditor og frist.
        </p>
      </header>
      <AuditPlanForm
        profiles={profiles ?? []}
        templates={templates ?? []}
      />
    </div>
  );
}
