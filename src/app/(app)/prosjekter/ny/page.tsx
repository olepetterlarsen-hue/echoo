import { createClient } from "@/lib/supabase/server";
import {
  getProjectStages,
  getActiveTemplates,
} from "@/lib/cache/static-data";
import { NewProjectForm } from "./new-project-form";
import { getServerT } from "@/lib/i18n/server";

interface PageProps {
  searchParams: Promise<{
    customer?: string;
    site?: string;
    template?: string;
  }>;
}

export default async function NewProjectPage({ searchParams }: PageProps) {
  const { customer, site, template } = await searchParams;
  const supabase = await createClient();
  const { t } = await getServerT();

  const [
    { data: customers },
    { data: sites },
    stages,
    templates,
    templateQuery,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name")
      .eq("active", true)
      .order("name"),
    supabase
      .from("sites")
      .select("id, name, customer_id")
      .eq("active", true)
      .order("name"),
    getProjectStages(),
    getActiveTemplates(),
    template
      ? supabase
          .from("project_templates")
          .select("*")
          .eq("id", template)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const selectedTemplate = templateQuery?.data;

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("proj_new")}</h1>
        <p className="text-text-2 text-sm">{t("proj_new_subtitle")}</p>
      </header>
      <NewProjectForm
        customers={customers ?? []}
        sites={sites ?? []}
        stages={stages}
        templates={templates}
        selectedTemplate={selectedTemplate ?? null}
        defaultCustomerId={customer}
        defaultSiteId={site}
      />
    </div>
  );
}
