import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { SiteForm } from "../site-form";

interface PageProps {
  searchParams: Promise<{ customer?: string }>;
}

export default async function NewSitePage({ searchParams }: PageProps) {
  const { t } = await getServerT();
  const { customer } = await searchParams;
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .eq("active", true)
    .order("name");

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("site_new")}</h1>
        <p className="text-text-2 text-sm">{t("site_new_subtitle")}</p>
      </header>
      <SiteForm
        mode="create"
        customers={customers ?? []}
        defaultCustomerId={customer}
      />
    </div>
  );
}
