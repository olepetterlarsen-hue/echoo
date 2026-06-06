import { getServerT } from "@/lib/i18n/server";
import { CustomerForm } from "../customer-form";

export default async function NyKundePage() {
  const { t } = await getServerT();
  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("cust_new")}</h1>
        <p className="text-text-2 text-sm">{t("cust_new_subtitle")}</p>
      </header>
      <CustomerForm mode="create" />
    </div>
  );
}
