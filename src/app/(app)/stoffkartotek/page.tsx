import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FlaskConical, FileDown, Upload } from "lucide-react";
import { GHS_PICTOGRAMS, type GhsCode } from "@/lib/ghs-pictograms";
import { getServerT } from "@/lib/i18n/server";

interface PageProps {
  searchParams: Promise<{ q?: string; ghs?: string }>;
}

export default async function StoffkartotekPage({ searchParams }: PageProps) {
  const { q, ghs } = await searchParams;
  const supabase = await createClient();
  const { t, locale } = await getServerT();

  let query = supabase
    .from("substances")
    .select(
      "id, name, manufacturer, cas_number, usage_area, storage_location, ghs_pictograms, sds_file_path, sds_revision_date, active",
    )
    .eq("active", true)
    .order("name");

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,manufacturer.ilike.%${q}%,cas_number.ilike.%${q}%,usage_area.ilike.%${q}%`,
    );
  }
  if (ghs) {
    query = query.contains("ghs_pictograms", [ghs]);
  }

  const { data: substances } = await query;

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FlaskConical className="size-6 text-text-2" />
            {t("subs_page_title")}
          </h1>
          <p className="text-text-2 text-sm">{t("subs_page_subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/stoffkartotek/import">
            <Button variant="secondary">
              <Upload className="size-4" />
              Importer
            </Button>
          </Link>
          <Link href="/stoffkartotek/ny">
            <Button>
              <Plus className="size-4" />
              {t("subs_new_button")}
            </Button>
          </Link>
        </div>
      </header>

      <form className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("subs_search_placeholder")}
            className="w-full h-10 rounded-md pl-9 pr-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
          />
        </div>
        <select
          name="ghs"
          defaultValue={ghs ?? ""}
          className="h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
        >
          <option value="">{t("subs_all_hazards")}</option>
          {Object.values(GHS_PICTOGRAMS).map((g) => (
            <option key={g.code} value={g.code}>
              {locale === "en" ? g.label_en : g.label_no}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          {t("subs_filter_button")}
        </Button>
      </form>

      <Card>
        <CardBody className="!p-0">
          {!substances || substances.length === 0 ? (
            <div className="p-8 text-center text-text-3 text-sm">
              <FlaskConical className="size-8 mx-auto mb-2 opacity-40" />
              {q || ghs ? (
                t("subs_empty_no_match")
              ) : (
                <>
                  {t("subs_empty_none_yet")}{" "}
                  <Link
                    href="/stoffkartotek/ny"
                    className="text-orange hover:underline"
                  >
                    {t("subs_add_first")}
                  </Link>
                </>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface text-text-3 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">{t("subs_col_name")}</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">
                    {t("subs_col_manufacturer")}
                  </th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">
                    {t("subs_col_usage")}
                  </th>
                  <th className="text-left px-4 py-3">
                    {t("subs_col_hazards")}
                  </th>
                  <th className="text-left px-4 py-3">{t("subs_col_sds")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {substances.map((s) => (
                  <tr key={s.id} className="hover:bg-card-hover">
                    <td className="px-4 py-3">
                      <Link
                        href={`/stoffkartotek/${s.id}`}
                        className="font-medium text-text-1 hover:text-orange"
                      >
                        {s.name}
                      </Link>
                      {s.cas_number && (
                        <div className="text-xs text-text-3 font-mono">
                          CAS: {s.cas_number}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-text-2">
                      {s.manufacturer ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-text-2">
                      {s.usage_area ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.ghs_pictograms ?? []).length === 0 ? (
                          <span className="text-text-3 text-xs">—</span>
                        ) : (
                          (s.ghs_pictograms as GhsCode[]).map((code) => {
                            const info = GHS_PICTOGRAMS[code];
                            if (!info) return null;
                            return (
                              <span
                                key={code}
                                title={
                                  locale === "en"
                                    ? info.label_en
                                    : info.label_no
                                }
                                className="inline-flex items-center justify-center size-6 rounded text-xs font-bold border-2"
                                style={{
                                  borderColor: info.color,
                                  color: info.color,
                                }}
                              >
                                {info.short}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.sds_file_path ? (
                        <Badge tone="green">
                          <FileDown className="size-3 mr-1" />
                          PDF
                        </Badge>
                      ) : (
                        <Badge tone="yellow">{t("subs_sds_missing")}</Badge>
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
