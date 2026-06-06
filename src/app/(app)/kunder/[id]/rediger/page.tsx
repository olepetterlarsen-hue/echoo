import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "../../customer-form";
import type { Customer } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: PageProps) {
  const { t } = await getServerT();
  const { id } = await params;
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();
  if (!customer) notFound();

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("cust_edit_title")}</h1>
      </header>
      <CustomerForm mode="edit" customer={customer as Customer} />
    </div>
  );
}
