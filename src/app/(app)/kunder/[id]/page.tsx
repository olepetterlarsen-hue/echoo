import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, MapPin, FolderOpen } from "lucide-react";
import { DEFAULT_MAP_COLOR } from "@/lib/customer-colors";
import { getServerT } from "@/lib/i18n/server";
import { CustomerActions } from "./customer-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { t } = await getServerT();
  const { id } = await params;
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select(
      "id, name, org_number, contact_person, contact_person_role, contact_person_phone_alt, contact_person_address, email, phone, address, postal_code, city, notes, map_color, active",
    )
    .eq("id", id)
    .single();
  if (!customer) notFound();

  const [{ data: sites }, { data: projects }] = await Promise.all([
    supabase
      .from("sites")
      .select("id, name, address, city, latitude, longitude, active")
      .eq("customer_id", id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("projects")
      .select("id, project_number, title, status, updated_at")
      .eq("customer_id", id)
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/kunder"
            className="text-text-3 hover:text-text-1 text-sm"
          >
            {t("cust_back_all")}
          </Link>
          <h1 className="text-2xl font-semibold mt-1 flex items-center gap-2">
            <span
              className="inline-block size-3 rounded-full shrink-0 border border-border"
              style={{
                backgroundColor: customer.map_color ?? DEFAULT_MAP_COLOR,
              }}
              aria-hidden
            />
            {customer.name}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-text-2">
            {customer.org_number && (
              <span className="font-mono text-xs">{customer.org_number}</span>
            )}
            {!customer.active && <Badge tone="neutral">{t("cust_status_inactive")}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/kunder/${id}/rediger`}>
            <Button variant="secondary" size="sm">
              <Pencil className="size-4" />
              {t("edit")}
            </Button>
          </Link>
          <CustomerActions customerId={id} customerName={customer.name} />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("cust_card_contact")}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-1 text-sm">
            <p>
              <span className="text-text-3">{t("cust_label_contact_person")}</span>{" "}
              {customer.contact_person ?? "—"}
            </p>
            {customer.contact_person_role && (
              <p>
                <span className="text-text-3">{t("cust_label_contact_role")}</span>{" "}
                {customer.contact_person_role}
              </p>
            )}
            <p>
              <span className="text-text-3">{t("cust_label_email")}</span>{" "}
              {customer.email ? (
                <a href={`mailto:${customer.email}`} className="text-orange hover:underline">
                  {customer.email}
                </a>
              ) : (
                "—"
              )}
            </p>
            <p>
              <span className="text-text-3">{t("cust_label_phone")}</span>{" "}
              {customer.phone ?? "—"}
            </p>
            {customer.contact_person_phone_alt && (
              <p>
                <span className="text-text-3">{t("cust_label_contact_phone_alt")}</span>{" "}
                {customer.contact_person_phone_alt}
              </p>
            )}
            {customer.contact_person_address && (
              <p>
                <span className="text-text-3">{t("cust_label_contact_address")}</span>{" "}
                {customer.contact_person_address}
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("cust_card_address")}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-1 text-sm">
            <p>{customer.address ?? "—"}</p>
            <p>
              {customer.postal_code} {customer.city}
            </p>
          </CardBody>
        </Card>
      </div>

      {customer.notes && (
        <Card>
          <CardBody>
            <h3 className="text-xs uppercase tracking-wider text-text-3 mb-2">
              {t("cust_card_notes")}
            </h3>
            <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
          </CardBody>
        </Card>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-4 text-text-2" />
              {t("cust_sites_count").replace("{n}", String(sites?.length ?? 0))}
            </CardTitle>
          </CardHeader>
          <CardBody className="!p-0">
            {!sites || sites.length === 0 ? (
              <div className="p-4 text-center text-text-3 text-sm">
                {t("cust_no_sites")}{" "}
                <Link
                  href={`/sites/ny?customer=${id}`}
                  className="text-orange hover:underline"
                >
                  {t("cust_add_site")}
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {sites.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/sites/${s.id}`}
                      className="flex items-center justify-between px-4 py-2 hover:bg-card-hover"
                    >
                      <div>
                        <div className="text-sm font-medium">{s.name}</div>
                        {(s.address || s.city) && (
                          <div className="text-xs text-text-3">
                            {[s.address, s.city].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </div>
                      {s.latitude && s.longitude && (
                        <MapPin className="size-3.5 text-text-3 shrink-0" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="size-4 text-text-2" />
              {t("cust_projects_count").replace(
                "{n}",
                String(projects?.length ?? 0),
              )}
            </CardTitle>
          </CardHeader>
          <CardBody className="!p-0">
            {!projects || projects.length === 0 ? (
              <div className="p-4 text-center text-text-3 text-sm">
                {t("cust_no_projects")}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {projects.slice(0, 10).map((p) => (
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
      </section>
    </div>
  );
}
