import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, FileDown, FlaskConical } from "lucide-react";
import { GHS_PICTOGRAMS, type GhsCode } from "@/lib/ghs-pictograms";
import { SdsDownloadButton } from "./sds-button";
import { getServerT } from "@/lib/i18n/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SubstanceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { t, locale } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: s } = await supabase
    .from("substances")
    .select("*")
    .eq("id", id)
    .single();
  if (!s) notFound();

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/stoffkartotek"
            className="text-text-3 hover:text-text-1 text-sm"
          >
            {t("subs_detail_back")}
          </Link>
          <h1 className="text-2xl font-semibold mt-1 flex items-center gap-2">
            <FlaskConical className="size-6 text-text-2" />
            {s.name}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-text-2">
            {s.manufacturer && <span>{s.manufacturer}</span>}
            {s.cas_number && (
              <span className="font-mono text-xs">CAS: {s.cas_number}</span>
            )}
            {!s.active && (
              <Badge tone="neutral">{t("subs_detail_inactive")}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {s.sds_file_path && <SdsDownloadButton path={s.sds_file_path} />}
          <Link href={`/stoffkartotek/${id}/rediger`}>
            <Button variant="secondary" size="sm">
              <Pencil className="size-4" />
              {t("edit")}
            </Button>
          </Link>
        </div>
      </header>

      {/* Fareklasser */}
      <Card>
        <CardHeader>
          <CardTitle>{t("subs_detail_hazards_title")}</CardTitle>
        </CardHeader>
        <CardBody>
          {(s.ghs_pictograms ?? []).length === 0 ? (
            <p className="text-sm text-text-3">
              {t("subs_detail_no_hazards")}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(s.ghs_pictograms as GhsCode[]).map((code) => {
                const info = GHS_PICTOGRAMS[code];
                if (!info) return null;
                return (
                  <div
                    key={code}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-md"
                  >
                    <span
                      className="inline-flex items-center justify-center size-10 rounded text-lg font-bold border-2 shrink-0"
                      style={{ borderColor: info.color, color: info.color }}
                    >
                      {info.short}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-1">
                        {locale === "en" ? info.label_en : info.label_no}
                      </div>
                      <div className="text-xs text-text-3">
                        {info.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("subs_detail_use_storage")}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <p>
              <span className="text-text-3">
                {t("subs_detail_usage_label")}
              </span>{" "}
              {s.usage_area ?? "—"}
            </p>
            <p>
              <span className="text-text-3">
                {t("subs_detail_storage_label")}
              </span>{" "}
              {s.storage_location ?? "—"}
            </p>
            <p>
              <span className="text-text-3">
                {t("subs_detail_quantity_label")}
              </span>{" "}
              {s.quantity_estimate ?? "—"}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("subs_col_sds")}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            {s.sds_file_path ? (
              <>
                <p className="flex items-center gap-2 text-green">
                  <FileDown className="size-4" />
                  {t("subs_detail_sds_uploaded")}
                </p>
                {s.sds_revision_date && (
                  <p>
                    <span className="text-text-3">
                      {t("subs_detail_revision_label")}
                    </span>{" "}
                    {new Date(s.sds_revision_date).toLocaleDateString(
                      locale === "en" ? "en-GB" : "no-NO",
                    )}
                  </p>
                )}
              </>
            ) : (
              <p className="text-yellow">{t("subs_detail_sds_missing")}</p>
            )}
          </CardBody>
        </Card>
      </div>

      {s.hazard_statements && (
        <Card>
          <CardHeader>
            <CardTitle>{t("subs_detail_h_statements_title")}</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm whitespace-pre-wrap">{s.hazard_statements}</p>
          </CardBody>
        </Card>
      )}

      {s.precautionary_measures && (
        <Card>
          <CardHeader>
            <CardTitle>{t("subs_detail_p_statements_title")}</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm whitespace-pre-wrap">
              {s.precautionary_measures}
            </p>
          </CardBody>
        </Card>
      )}

      {s.notes && (
        <Card>
          <CardHeader>
            <CardTitle>{t("subs_detail_notes_title")}</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm whitespace-pre-wrap">{s.notes}</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
