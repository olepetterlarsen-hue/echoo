import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Layers } from "lucide-react";
import type { CategoryFieldSchema } from "@/lib/types/database";

export default async function CategoriesPage() {
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

  const { t } = await getServerT();

  const { data: categories } = await supabase
    .from("project_categories")
    .select("*")
    .order("order_index");

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Layers className="size-6 text-text-2" />
            {t("adm_cat_title")}
          </h1>
          <p className="text-text-2 text-sm">{t("adm_cat_subtitle")}</p>
        </div>
        <Link href="/admin/kategorier/ny">
          <Button>
            <Plus className="size-4" />
            {t("adm_cat_new")}
          </Button>
        </Link>
      </header>

      <Card>
        <CardBody className="!p-0">
          {!categories || categories.length === 0 ? (
            <div className="p-8 text-center text-text-3 text-sm">
              {t("adm_cat_empty")}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface text-text-3 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">{t("adm_cat_col_name")}</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">
                    {t("adm_cat_col_slug")}
                  </th>
                  <th className="text-left px-4 py-3">
                    {t("adm_cat_col_field_count")}
                  </th>
                  <th className="text-left px-4 py-3">{t("adm_cat_col_status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.map((c) => {
                  const fields = (c.field_schema ?? []) as CategoryFieldSchema;
                  return (
                    <tr key={c.id} className="hover:bg-card-hover">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/kategorier/${c.id}`}
                          className="font-medium text-text-1 hover:text-orange"
                        >
                          {c.name}
                        </Link>
                        {c.description && (
                          <div className="text-xs text-text-3 mt-0.5">
                            {c.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-text-2 font-mono text-xs">
                        {c.slug}
                      </td>
                      <td className="px-4 py-3 text-text-2">
                        {fields.length}
                      </td>
                      <td className="px-4 py-3">
                        {c.is_active ? (
                          <Badge tone="green">{t("adm_cat_active")}</Badge>
                        ) : (
                          <Badge tone="neutral">{t("adm_cat_inactive")}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
