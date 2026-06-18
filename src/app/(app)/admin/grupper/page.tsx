import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users } from "lucide-react";
import { GenerateOpTeamsButton } from "./generate-button";
import { AdminTabs } from "@/components/app/admin-tabs";
import { USERS_TABS } from "@/components/app/admin-tab-configs";

export default async function GroupsPage() {
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

  // Hent grupper + medlemstellinger
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, email, description, color")
    .order("name");

  // Hent medlemstellinger pr gruppe
  const counts = new Map<string, number>();
  if (groups && groups.length > 0) {
    const { data: members } = await supabase
      .from("group_members")
      .select("group_id");
    for (const m of members ?? []) {
      counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
    }
  }

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="size-6 text-text-2" />
            Brukere &amp; Grupper
          </h1>
          <p className="text-text-2 text-sm">{t("adm_grp_subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GenerateOpTeamsButton />
          <Link href="/admin/grupper/ny">
            <Button>
              <Plus className="size-4" />
              {t("adm_grp_new")}
            </Button>
          </Link>
        </div>
      </header>
      <AdminTabs tabs={USERS_TABS} />

      <Card>
        <CardBody className="!p-0">
          {!groups || groups.length === 0 ? (
            <div className="p-8 text-center text-text-3 text-sm">
              <Users className="size-8 mx-auto mb-2 opacity-40" />
              {t("adm_grp_empty")}{" "}
              <Link
                href="/admin/grupper/ny"
                className="text-orange hover:underline"
              >
                {t("adm_grp_create_first")}
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface text-text-3 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">{t("adm_grp_col_group")}</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">
                    {t("adm_grp_col_email")}
                  </th>
                  <th className="text-left px-4 py-3">{t("adm_grp_col_members")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groups.map((g) => (
                  <tr key={g.id} className="hover:bg-card-hover">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/grupper/${g.id}`}
                        className="font-medium text-text-1 hover:text-orange flex items-center gap-2"
                      >
                        <span
                          className="inline-block size-3 rounded-full shrink-0 border border-border"
                          style={{ backgroundColor: g.color ?? "#9A9AA4" }}
                          aria-hidden
                        />
                        {g.name}
                      </Link>
                      {g.description && (
                        <div className="text-xs text-text-3 mt-0.5">
                          {g.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-text-2">
                      {g.email ? (
                        <a
                          href={`mailto:${g.email}`}
                          className="hover:text-orange"
                        >
                          {g.email}
                        </a>
                      ) : (
                        <span className="text-text-3">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={counts.get(g.id) ?? 0 > 0 ? "orange" : "neutral"}
                      >
                        {counts.get(g.id) ?? 0}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
