import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MapPin, Upload } from "lucide-react";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { GeocodeButton } from "./geocode-button";

interface PageProps {
  searchParams: Promise<{ q?: string; customer?: string }>;
}

export default async function SitesPage({ searchParams }: PageProps) {
  const { t } = await getServerT();
  const { q, customer } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("sites")
    .select(
      "id, name, external_site_id, address, city, latitude, longitude, customer_id, customer:customers(id, name)",
    )
    .eq("active", true)
    .order("name");

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,external_site_id.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%`,
    );
  }
  if (customer) query = query.eq("customer_id", customer);

  const { data: sites } = await query;

  // Sjekk om bruker er admin (for å vise Import-knapp)
  const sb2 = await createServerClient();
  const { data: { user } } = await sb2.auth.getUser();
  const { data: me } = user
    ? await sb2.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = me?.role === "admin";

  // Antall sites som mangler koordinater (for geokod-knapp)
  const { count: missingCoords } = await sb2
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("active", true)
    .is("latitude", null)
    .not("address", "is", null);

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{t("site_title")}</h1>
          <p className="text-text-2 text-sm">{t("site_subtitle")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/kart">
            <Button variant="secondary">
              <MapPin className="size-4" />
              {t("site_show_on_map")}
            </Button>
          </Link>
          {isAdmin && (
            <Link href="/admin/import-sites">
              <Button variant="secondary">
                <Upload className="size-4" />
                {t("site_import_csv")}
              </Button>
            </Link>
          )}
          <Link href="/sites/ny">
            <Button>
              <Plus className="size-4" />
              {t("site_new")}
            </Button>
          </Link>
        </div>
      </header>

      <GeocodeButton initialMissing={missingCoords ?? 0} />

      <form className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("site_search_placeholder")}
            className="w-full h-10 rounded-md pl-9 pr-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
          />
        </div>
        <Button type="submit" variant="secondary">
          {t("site_filter")}
        </Button>
      </form>

      <Card>
        <CardBody className="!p-0">
          {!sites || sites.length === 0 ? (
            <div className="p-8 text-center text-text-3 text-sm">
              <MapPin className="size-8 mx-auto mb-2 opacity-40" />
              {t("site_empty")}{" "}
              <Link href="/sites/ny" className="text-orange hover:underline">
                {t("site_empty_create_first")}
              </Link>
              .
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface text-text-3 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">{t("site_col_name")}</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">
                    {t("site_col_site_id")}
                  </th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">
                    {t("site_col_customer")}
                  </th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">
                    {t("site_col_address")}
                  </th>
                  <th className="text-left px-4 py-3">{t("site_col_coords")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(sites as unknown as Array<{
                  id: string;
                  name: string;
                  external_site_id: string | null;
                  address: string | null;
                  city: string | null;
                  latitude: number | null;
                  longitude: number | null;
                  customer?: { id: string; name: string } | null;
                }>).map((s) => (
                  <tr key={s.id} className="hover:bg-card-hover">
                    <td className="px-4 py-3">
                      <Link
                        href={`/sites/${s.id}`}
                        className="font-medium text-text-1 hover:text-orange"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-text-2 font-mono text-xs">
                      {s.external_site_id ?? "–"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {s.customer ? (
                        <Link
                          href={`/kunder/${s.customer.id}`}
                          className="text-text-2 hover:text-orange"
                        >
                          {s.customer.name}
                        </Link>
                      ) : (
                        <span className="text-text-3">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-text-2">
                      {[s.address, s.city].filter(Boolean).join(", ") || "–"}
                    </td>
                    <td className="px-4 py-3">
                      {s.latitude && s.longitude ? (
                        <span className="text-xs font-mono text-text-2 inline-flex items-center gap-1">
                          <MapPin className="size-3 text-green" />
                          {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                        </span>
                      ) : (
                        <Badge tone="yellow">{t("site_coords_missing")}</Badge>
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
