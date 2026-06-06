import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2 } from "lucide-react";
import { DEFAULT_MAP_COLOR } from "@/lib/customer-colors";
import { getServerT } from "@/lib/i18n/server";

interface PageProps {
  searchParams: Promise<{ q?: string; show?: "active" | "all" }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const { t } = await getServerT();
  const { q, show } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select(
      "id, name, org_number, contact_person, email, phone, city, map_color, active, created_at",
    )
    .order("name");

  if (show !== "all") {
    query = query.eq("active", true);
  }

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,org_number.ilike.%${q}%,contact_person.ilike.%${q}%,city.ilike.%${q}%`,
    );
  }

  const { data: customers } = await query;

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{t("cust_title")}</h1>
          <p className="text-text-2 text-sm">{t("cust_subtitle")}</p>
        </div>
        <Link href="/kunder/ny">
          <Button>
            <Plus className="size-4" />
            {t("cust_new")}
          </Button>
        </Link>
      </header>

      <form className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("cust_search_placeholder")}
            className="w-full h-10 rounded-md pl-9 pr-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
          />
        </div>
        <select
          name="show"
          defaultValue={show ?? "active"}
          className="h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
        >
          <option value="active">{t("cust_show_active")}</option>
          <option value="all">{t("cust_show_all")}</option>
        </select>
        <Button type="submit" variant="secondary">
          {t("cust_filter")}
        </Button>
      </form>

      <Card>
        <CardBody className="!p-0">
          {!customers || customers.length === 0 ? (
            <div className="p-8 text-center text-text-3 text-sm">
              <Building2 className="size-8 mx-auto mb-2 opacity-40" />
              {t("cust_empty")}{" "}
              <Link href="/kunder/ny" className="text-orange hover:underline">
                {t("cust_empty_create_first")}
              </Link>
              .
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface text-text-3 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">{t("cust_col_name")}</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">
                    {t("cust_col_org_number")}
                  </th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">
                    {t("cust_col_contact")}
                  </th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">
                    {t("cust_col_city")}
                  </th>
                  <th className="text-left px-4 py-3">{t("cust_col_status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-card-hover">
                    <td className="px-4 py-3">
                      <Link
                        href={`/kunder/${c.id}`}
                        className="font-medium text-text-1 hover:text-orange flex items-center gap-2"
                      >
                        <span
                          className="inline-block size-2.5 rounded-full shrink-0 border border-border"
                          style={{
                            backgroundColor: c.map_color ?? DEFAULT_MAP_COLOR,
                          }}
                          aria-hidden
                        />
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-text-2 font-mono text-xs">
                      {c.org_number ?? "–"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-text-2">
                      {c.contact_person ?? "–"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-text-2">
                      {c.city ?? "–"}
                    </td>
                    <td className="px-4 py-3">
                      {c.active ? (
                        <Badge tone="green">{t("cust_status_active")}</Badge>
                      ) : (
                        <Badge tone="neutral">{t("cust_status_inactive")}</Badge>
                      )}
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
