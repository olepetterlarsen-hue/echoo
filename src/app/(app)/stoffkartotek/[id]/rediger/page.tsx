import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubstanceForm } from "../../substance-form";
import { getServerT } from "@/lib/i18n/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSubstancePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: substance } = await supabase
    .from("substances")
    .select("*")
    .eq("id", id)
    .single();
  if (!substance) notFound();

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("subs_form_edit_title")}</h1>
        <p className="text-text-2 text-sm">{substance.name}</p>
      </header>
      <SubstanceForm mode="edit" substance={substance} />
    </div>
  );
}
