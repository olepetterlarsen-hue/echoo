import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, MapPin } from "lucide-react";
import { getServerT } from "@/lib/i18n/server";
import { SiteDeleteButton } from "./site-delete-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SiteDetailPage({ params }: PageProps) {
  const { t } = await getServerT();
  const { id } = await params;
  const supabase = await createClient();
  const { data: site } = await supabase
    .from("sites")
    .select("*, customer:customers(id, name)")
    .eq("id", id)
    .single();
  if (!site) notFound();

  type SiteWithCustomer = typeof site & {
    customer?: { id: string; name: string } | null;
  };
  const s = site as SiteWithCustomer;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, project_number, title, status")
    .eq("site_id", id)
    .order("updated_at", { ascending: false });

  const hasCoords = s.latitude !== null && s.longitude !== null;

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/sites"
            className="text-text-3 hover:text-text-1 text-sm"
          >
            {t("site_back_all")}
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{s.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-text-2">
            {s.external_site_id && (
              <span className="font-mono text-xs">{s.external_site_id}</span>
            )}
            {s.site_type && <Badge tone="neutral">{s.site_type}</Badge>}
            {s.customer && (
              <Link
                href={`/kunder/${s.customer.id}`}
                className="text-orange hover:underline text-xs"
              >
                {s.customer.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/sites/${id}/rediger`}>
            <Button variant="secondary" size="sm">
              <Pencil className="size-4" />
              {t("edit")}
            </Button>
          </Link>
          <SiteDeleteButton siteId={id} siteName={s.name} />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("cust_card_address")}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-1 text-sm">
            <p>{s.address ?? "—"}</p>
            <p>
              {s.postal_code} {s.city}
            </p>
            {s.province && (
              <p className="text-text-3 text-xs">{s.province}</p>
            )}
            {s.ssb_number && (
              <p className="text-text-3 text-xs mt-2">
                {t("site_label_ssb_inline")}{" "}
                <span className="font-mono">{s.ssb_number}</span>
              </p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("site_col_coords")}</CardTitle>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            {hasCoords ? (
              <>
                <p className="font-mono">
                  {s.latitude!.toFixed(6)}, {s.longitude!.toFixed(6)}
                </p>
                <a
                  href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange hover:underline text-xs inline-flex items-center gap-1"
                >
                  <MapPin className="size-3" />
                  {t("site_open_in_google")}
                </a>
              </>
            ) : (
              <p className="text-text-3">{t("site_no_coords")}</p>
            )}
          </CardBody>
        </Card>
      </div>

      {s.notes && (
        <Card>
          <CardBody>
            <h3 className="text-xs uppercase tracking-wider text-text-3 mb-2">
              {t("cust_card_notes")}
            </h3>
            <p className="text-sm whitespace-pre-wrap">{s.notes}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("site_projects_on_site")}</CardTitle>
        </CardHeader>
        <CardBody className="!p-0">
          {!projects || projects.length === 0 ? (
            <div className="p-4 text-center text-text-3 text-sm">
              {t("site_no_projects")}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/prosjekter/${p.id}`}
                    className="flex items-center justify-between px-4 py-2 hover:bg-card-hover"
                  >
                    <div>
                      <div className="text-sm font-medium">{p.title}</div>
                      <div className="text-xs text-text-3 font-mono">
                        {p.project_number}
                      </div>
                    </div>
                    <Badge
                      tone={
                        p.status === "aktiv"
                          ? "green"
                          : p.status === "ferdigstilt"
                            ? "blue"
                            : "neutral"
                      }
                    >
                      {p.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
