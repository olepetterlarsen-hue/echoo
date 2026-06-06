import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTemplate } from "@/lib/document-templates";
import { DocumentEditor } from "@/app/(app)/prosjekter/[id]/dokumenter/[kind]/document-editor";
import type { DocumentKind } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SkjemaPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { t } = await getServerT();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();
  if (!doc) notFound();

  // For internkontroll: alltid vis via /skjemaer/[id] selv om dokumentet
  // er koblet til prosjekt (siden flere internkontroller kan eksistere
  // per prosjekt og lookup-by-kind ikke fungerer entydig).
  // For øvrige dokumenttyper med prosjekt: omdirigere til prosjekt-visning.
  if (doc.project_id && doc.kind !== "internkontroll") {
    redirect(`/prosjekter/${doc.project_id}/dokumenter/${doc.kind}?v=${doc.version}`);
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Last prosjekt hvis dokumentet har det (gjelder internkontroll)
  let project = null;
  if (doc.project_id) {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", doc.project_id)
      .single();
    project = data;
  }

  // For custom kind: template_id ligger i data._template_id
  const data = (doc.data ?? {}) as Record<string, unknown>;
  const variant =
    doc.kind === "custom" && typeof data._template_id === "string"
      ? (data._template_id as string)
      : undefined;
  const template = await getTemplate(doc.kind as DocumentKind, variant);

  return (
    <DocumentEditor
      project={project}
      template={template}
      existing={doc}
      profile={myProfile!}
      backHref={project ? `/prosjekter/${project.id}` : "/skjemaer"}
      backLabel={
        project ? t("form_back_to_project") : t("form_back_to_forms")
      }
    />
  );
}
