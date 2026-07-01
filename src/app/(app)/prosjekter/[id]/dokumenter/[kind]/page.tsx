import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentEditor } from "./document-editor";
import { getTemplate } from "@/lib/document-templates";
import { getAppSettings } from "@/lib/settings";
import type { DocumentKind } from "@/lib/types/database";

const VALID_KINDS: DocumentKind[] = [
  "risikovurdering",
  "sluttkontroll",
  "samsvarserklaering",
  "forenklet_sikkerhet",
  "sja",
  "ruh",
  "startup_checklist",
  "stikkprovekontroll",
  "custom",
];

interface PageProps {
  params: Promise<{ id: string; kind: string }>;
  searchParams: Promise<{ v?: string }>;
}

export default async function DocumentPage({ params, searchParams }: PageProps) {
  const { id, kind } = await params;
  const { v } = await searchParams;

  if (!VALID_KINDS.includes(kind as DocumentKind)) notFound();
  const docKind = kind as DocumentKind;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  let query = supabase
    .from("documents")
    .select("*")
    .eq("project_id", id)
    .eq("kind", docKind);
  if (v) {
    query = query.eq("version", Number(v));
  } else {
    query = query.order("version", { ascending: false }).limit(1);
  }
  const { data: docs } = await query;
  const existing = docs?.[0] ?? null;

  // For Samsvarserklæring og SJA: variant bestemmes av dokumentets lagrede
  // variant (hvis eksisterende), ellers av prosjektets installation_type.
  let variant: string | undefined;
  const stored = (existing?.data as Record<string, unknown> | undefined)
    ?._variant;
  if (docKind === "samsvarserklaering") {
    variant =
      (typeof stored === "string" ? stored : null) ??
      project.installation_type ??
      "bolig";
  } else if (docKind === "sja") {
    variant =
      (typeof stored === "string" ? stored : null) ??
      (project.installation_type === "telecom" ? "telekom" : "standard");
  }

  const [template, settings] = await Promise.all([
    getTemplate(docKind, variant),
    getAppSettings(),
  ]);

  return (
    <DocumentEditor
      project={project}
      template={template}
      existing={existing}
      profile={myProfile!}
      samsvarVariant={variant}
      settings={settings}
    />
  );
}
