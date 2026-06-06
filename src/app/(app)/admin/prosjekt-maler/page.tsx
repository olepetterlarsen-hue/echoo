import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileStack } from "lucide-react";

export default async function ProjectTemplatesPage() {
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

  const { data: templates } = await supabase
    .from("project_templates")
    .select(
      "*, category:project_categories(name)",
    )
    .order("order_index");

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileStack className="size-6 text-text-2" />
            {t("adm_ptpl_title")}
          </h1>
          <p className="text-text-2 text-sm">{t("adm_ptpl_subtitle")}</p>
        </div>
        <Link href="/admin/prosjekt-maler/ny">
          <Button>
            <Plus className="size-4" />
            {t("adm_ptpl_new")}
          </Button>
        </Link>
      </header>

      <Card>
        <CardBody className="!p-0">
          {!templates || templates.length === 0 ? (
            <div className="p-8 text-center text-text-3 text-sm">
              <FileStack className="size-8 mx-auto mb-2 opacity-40" />
              {t("adm_ptpl_empty")}{" "}
              <Link
                href="/admin/prosjekt-maler/ny"
                className="text-orange hover:underline"
              >
                {t("adm_ptpl_create_first")}
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface text-text-3 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">{t("adm_ptpl_col_name")}</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">
                    {t("adm_ptpl_col_category")}
                  </th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">
                    {t("adm_ptpl_col_installation")}
                  </th>
                  <th className="text-left px-4 py-3">{t("adm_ptpl_col_status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {templates.map((tpl) => {
                  const cat = (
                    tpl as unknown as { category?: { name: string } | null }
                  ).category;
                  return (
                    <tr key={tpl.id} className="hover:bg-card-hover">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/prosjekt-maler/${tpl.id}`}
                          className="font-medium text-text-1 hover:text-orange"
                        >
                          {tpl.name}
                        </Link>
                        {tpl.description && (
                          <div className="text-xs text-text-3 mt-0.5">
                            {tpl.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-text-2">
                        {cat?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-text-2">
                        {tpl.default_installation_type ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {tpl.is_active ? (
                          <Badge tone="green">{t("adm_ptpl_active")}</Badge>
                        ) : (
                          <Badge tone="neutral">{t("adm_ptpl_inactive")}</Badge>
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
