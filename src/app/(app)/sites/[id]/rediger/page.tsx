import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteForm } from "../../site-form";
import type { Site } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSitePage({ params }: PageProps) {
  const { t } = await getServerT();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: site }, { data: customers }] = await Promise.all([
    supabase.from("sites").select("*").eq("id", id).single(),
    supabase
      .from("customers")
      .select("id, name")
      .eq("active", true)
      .order("name"),
  ]);
  if (!site) notFound();

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("site_edit_title")}</h1>
      </header>
      <SiteForm
        mode="edit"
        site={site as Site}
        customers={customers ?? []}
      />
    </div>
  );
}
