import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { getTemplate, DEFAULT_TEMPLATES } from "@/lib/document-templates";
import type { DocumentKind } from "@/lib/types/database";
import { DOCUMENT_KIND_LABELS } from "@/lib/types/database";
import { TemplateEditor } from "./template-editor";

const VALID: DocumentKind[] = [
  "risikovurdering",
  "sluttkontroll",
  "samsvarserklaering",
  "forenklet_sikkerhet",
  "sja",
  "ruh",
  "startup_checklist",
  "stikkprovekontroll",
];

interface PageProps {
  params: Promise<{ kind: string }>;
}

export default async function TemplateEditPage({ params }: PageProps) {
  const { kind: kindParam } = await params;
  if (!VALID.includes(kindParam as DocumentKind)) notFound();
  const kind = kindParam as DocumentKind;

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

  const current = await getTemplate(kind);
  const defaultDef = DEFAULT_TEMPLATES[kind];

  const { t, locale } = await getServerT();

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/maler"
          className="text-text-3 hover:text-text-1 text-sm"
        >
          {t("adm_tpl_back_to_list")}
        </Link>
        <h1 className="text-2xl font-semibold">
          {DOCUMENT_KIND_LABELS[kind][locale]}
        </h1>
        <p className="text-text-2 text-sm">{t("adm_tpl_kind_subtitle")}</p>
      </header>
      <TemplateEditor
        kind={kind}
        current={current}
        defaultDef={defaultDef}
      />
    </div>
  );
}
