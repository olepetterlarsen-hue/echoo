import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import {
  DOCUMENT_KIND_LABELS,
  ELEVATED_ROLES,
  type DocumentKind,
  type UserRole,
} from "@/lib/types/database";
import { NewSkjemaButton } from "./new-skjema-button";
import { PdfDownloadLink } from "./pdf-download-link";
import { getHiddenKinds, getCustomTemplates } from "@/lib/document-templates";
import { getServerT } from "@/lib/i18n/server";

// Innebygde skjemaer som kan opprettes utenfor prosjekt
export const STANDALONE_KINDS: DocumentKind[] = [
  "sja",
  "ruh",
  "startup_checklist",
  "stikkprovekontroll",
];

export default async function SkjemaerPage() {
  const supabase = await createClient();
  const { t, locale } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();
  const myRole = (myProfile?.role ?? "elektriker") as UserRole;
  const canSeeAll = ELEVATED_ROLES.includes(myRole);

  let query = supabase
    .from("documents")
    .select(
      "id, kind, version, status, created_at, signed_at, signed_by, created_by, pdf_path, data, " +
        "creator:profiles!documents_created_by_fkey(id, full_name, email)",
    )
    .is("project_id", null)
    .order("created_at", { ascending: false });

  if (!canSeeAll) {
    query = query.eq("created_by", user!.id);
  }

  const { data: docs } = await query;
  const hidden = await getHiddenKinds();
  const visibleStandaloneKinds = STANDALONE_KINDS.filter((k) => !hidden.has(k));
  const customTemplates = (await getCustomTemplates()).filter(
    (t) => !t.is_hidden,
  );

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{t("form_page_title")}</h1>
          <p className="text-text-2 text-sm">
            {canSeeAll
              ? t("form_page_subtitle_all")
              : t("form_page_subtitle_own")}
          </p>
        </div>
        <NewSkjemaButton
          builtins={visibleStandaloneKinds}
          customTemplates={customTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            ai_generated: t.ai_generated,
          }))}
        />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            {canSeeAll ? t("form_card_title_all") : t("form_card_title_mine")}{" "}
            <span className="text-text-3 text-sm font-normal">
              ({docs?.length ?? 0})
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody className="!p-0">
          {!docs || docs.length === 0 ? (
            <div className="p-6 text-center text-text-3 text-sm">
              {t("form_empty_state")}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {(docs as unknown as Array<{
                id: string;
                kind: DocumentKind;
                version: number;
                status: "utkast" | "signert";
                created_at: string;
                signed_at: string | null;
                signed_by: string | null;
                created_by: string;
                pdf_path: string | null;
                data: Record<string, unknown>;
                creator?: {
                  id: string;
                  full_name: string | null;
                  email: string;
                } | null;
              }>).map((doc) => {
                const builtin = DOCUMENT_KIND_LABELS[doc.kind];
                const customId =
                  doc.kind === "custom" &&
                  typeof doc.data?._template_id === "string"
                    ? (doc.data._template_id as string)
                    : null;
                const customName = customId
                  ? customTemplates.find((t) => t.id === customId)?.name
                  : null;
                const label = customName ?? builtin?.[locale] ?? doc.kind;
                return (
                  <li key={doc.id}>
                    <Link
                      href={`/skjemaer/${doc.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-card-hover flex-wrap"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text-1 truncate">
                          {label}
                        </div>
                        <div className="text-xs text-text-3 truncate">
                          {doc.creator?.full_name ?? doc.creator?.email ?? ""}
                          {" · "}
                          {new Date(doc.created_at).toLocaleDateString(
                            locale === "en" ? "en-GB" : "no-NO",
                          )}
                        </div>
                      </div>
                      <Badge tone={doc.status === "signert" ? "green" : "yellow"}>
                        v{doc.version} ·{" "}
                        {doc.status === "signert"
                          ? t("form_status_signed")
                          : t("form_status_draft")}
                      </Badge>
                      {doc.status === "signert" && doc.pdf_path && (
                        <PdfDownloadLink
                          href={`/api/documents/${doc.id}/pdf`}
                        />
                      )}
                      {doc.status === "utkast" && (
                        <Button size="sm" variant="secondary">
                          <Pencil className="size-4" />
                        </Button>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
