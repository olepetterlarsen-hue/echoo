import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { SubstanceForm } from "../substance-form";
import { getServerT } from "@/lib/i18n/server";

export default async function NewSubstancePage() {
  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getCurrentOrgId(supabase);

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">
          {t("subs_form_create_title")}
        </h1>
        <p className="text-text-2 text-sm">
          {t("subs_form_create_subtitle")}
        </p>
      </header>
      <SubstanceForm mode="create" orgId={orgId} />
    </div>
  );
}
