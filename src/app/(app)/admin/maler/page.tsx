import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { DEFAULT_TEMPLATES, getCustomTemplates } from "@/lib/document-templates";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles } from "lucide-react";
import { DOCUMENT_KIND_LABELS, type DocumentKind } from "@/lib/types/database";
import { TemplateRowActions } from "./template-row-actions";

const BUILTIN_KINDS: DocumentKind[] = [
  "risikovurdering",
  "sluttkontroll",
  "samsvarserklaering",
  "forenklet_sikkerhet",
  "sja",
  "ruh",
  "startup_checklist",
  "stikkprovekontroll",
  "internkontroll",
];

export default async function TemplatesPage() {
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

  const { t, locale } = await getServerT();

  const { data: dbTemplates } = await supabase
    .from("document_templates")
    .select("kind, updated_at, is_hidden");
  const byKind = new Map(
    (dbTemplates ?? []).map((t) => [
      t.kind,
      { updated_at: t.updated_at, is_hidden: t.is_hidden },
    ]),
  );

  const customTemplates = await getCustomTemplates();
  const dateLocale = locale === "no" ? "no-NO" : "en-GB";

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-8">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{t("adm_tpl_title")}</h1>
          <p className="text-text-2 text-sm">{t("adm_tpl_subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/maler/ny">
            <Button>
              <Plus className="size-4" />
              {t("adm_tpl_new")}
            </Button>
          </Link>
          <Link href="/admin/maler/ny?ai=1">
            <Button variant="secondary">
              <Sparkles className="size-4" />
              {t("adm_tpl_new_ai")}
            </Button>
          </Link>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t("adm_tpl_section_custom")}{" "}
          <span className="text-text-3 text-sm font-normal">
            ({customTemplates.length})
          </span>
        </h2>
        {customTemplates.length === 0 ? (
          <Card>
            <CardBody className="text-center text-text-3 text-sm py-8">
              {t("adm_tpl_no_custom")}
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customTemplates.map((tpl) => {
              return (
                <Card
                  key={tpl.id}
                  className={tpl.is_hidden ? "opacity-60 border-dashed" : ""}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{tpl.name}</CardTitle>
                        {tpl.subtitle && (
                          <p className="text-xs text-text-3 mt-1">
                            {tpl.subtitle}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {tpl.is_hidden && <Badge tone="red">{t("adm_tpl_hidden")}</Badge>}
                        {tpl.ai_generated && (
                          <Badge tone="blue">{t("adm_tpl_ai_generated")}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-3">
                    <p className="text-xs text-text-3">
                      {t("adm_tpl_last_updated").replace(
                        "{date}",
                        new Date(tpl.updated_at).toLocaleDateString(dateLocale),
                      )}
                    </p>
                    <Link href={`/admin/maler/custom/${tpl.id}`}>
                      <Button variant="secondary" size="sm" className="w-full">
                        {t("adm_tpl_edit")}
                      </Button>
                    </Link>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("adm_tpl_section_default")}</h2>
        <p className="text-sm text-text-3 -mt-2">{t("adm_tpl_default_note")}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BUILTIN_KINDS.map((kind) => {
            const def = DEFAULT_TEMPLATES[kind];
            const meta = byKind.get(kind);
            const customizedAt = meta?.updated_at;
            const isHidden = meta?.is_hidden ?? false;
            return (
              <Card
                key={kind}
                className={isHidden ? "opacity-60 border-dashed" : ""}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{DOCUMENT_KIND_LABELS[kind][locale]}</CardTitle>
                      <p className="text-xs text-text-3 mt-1">{def.subtitle}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isHidden && <Badge tone="red">{t("adm_tpl_hidden")}</Badge>}
                      <Badge tone={customizedAt ? "orange" : "neutral"}>
                        {customizedAt
                          ? t("adm_tpl_customized")
                          : t("adm_tpl_standard")}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  <p className="text-xs text-text-3">
                    {t("adm_tpl_sections_fields")
                      .replace("{sections}", String(def.sections.length))
                      .replace(
                        "{fields}",
                        String(
                          def.sections.reduce((n, s) => n + s.fields.length, 0),
                        ),
                      )}
                  </p>
                  <div className="flex gap-2">
                    <Link href={`/admin/maler/${kind}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">
                        {t("adm_tpl_edit")}
                      </Button>
                    </Link>
                    <TemplateRowActions kind={kind} isHidden={isHidden} />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
