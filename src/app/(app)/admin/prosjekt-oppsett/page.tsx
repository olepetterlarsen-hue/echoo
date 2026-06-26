import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { Layers } from "lucide-react";
import { SetupTabs } from "./setup-tabs";
import type { Stage, Category, Template } from "./setup-tabs";
import { AdminTabs } from "@/components/app/admin-tabs";
import { SETTINGS_TABS } from "@/components/app/admin-tab-configs";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProsjektOppsettPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
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
  if (me?.role !== "admin") redirect("/dashboard");
  const orgId = await getCurrentOrgId(supabase);

  const [
    { data: stages },
    { data: categories },
    { data: templates },
  ] = await Promise.all([
    supabase
      .from("project_stages")
      .select("id, name, color, order_index, is_active")
      .eq("organization_id", orgId)
      .order("order_index", { ascending: true }),
    supabase
      .from("project_categories")
      .select("id, name, slug, description, is_active, field_schema")
      .eq("organization_id", orgId)
      .order("order_index", { ascending: true }),
    supabase
      .from("project_templates")
      .select("id, name, description, is_active, order_index")
      .eq("organization_id", orgId)
      .order("order_index", { ascending: true }),
  ]);

  const initialTab =
    tab === "kategorier" || tab === "maler" ? tab : "stadier";

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Layers className="size-6 text-text-2" />
          Innstillinger
        </h1>
        <p className="text-text-2 text-sm">
          Definer hvordan prosjekter flyter gjennom bedriften — kanban-stadier,
          prosjekt-kategorier og prosjekt-maler.
        </p>
      </header>
      <AdminTabs tabs={SETTINGS_TABS} />

      <SetupTabs
        initialTab={initialTab}
        stages={(stages ?? []) as Stage[]}
        categories={(categories ?? []) as Category[]}
        templates={(templates ?? []) as Template[]}
      />
    </div>
  );
}
