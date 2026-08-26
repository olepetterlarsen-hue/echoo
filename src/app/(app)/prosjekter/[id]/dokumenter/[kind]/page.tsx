import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentEditor } from "./document-editor";
import { getTemplate } from "@/lib/document-templates";
import { getAppSettings } from "@/lib/settings";
import type { DocumentAttachment, DocumentKind } from "@/lib/types/database";
import { PARTICIPANT_SIGNING_KINDS } from "@/lib/types/database";
import type {
  ParticipantWithProfile,
  OrgMember,
} from "./participants-panel";
import type { AttachmentItem } from "./attachments-panel";

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

  // Deltaker-signering (f.eks. SJA): hent org-medlemmer + eksisterende
  // deltakere slik at alle på anlegget kan signere samme dokument.
  let participants: ParticipantWithProfile[] = [];
  let orgMembers: OrgMember[] = [];
  if (PARTICIPANT_SIGNING_KINDS.includes(docKind)) {
    const { data: members } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("active", true)
      .order("full_name");
    orgMembers = members ?? [];

    if (existing) {
      const { data: parts } = await supabase
        .from("document_participants")
        .select(
          "*, profile:profiles!document_participants_profile_id_fkey(id, full_name, email)",
        )
        .eq("document_id", existing.id)
        .order("created_at");
      participants = (parts ?? []) as unknown as ParticipantWithProfile[];
    }
  }

  // B4/F-15: bildevedlegg — hentes kun for eksisterende (lagrede) dokumenter,
  // et utkast som ikke er lagret ennå har ingen document_id å henge dem på.
  // Signerte URL-er genereres server-side (bucketen er privat).
  let attachments: AttachmentItem[] = [];
  if (existing) {
    const { data: atts } = await supabase
      .from("document_attachments")
      .select("*")
      .eq("document_id", existing.id)
      .order("created_at");
    const rows: DocumentAttachment[] = atts ?? [];
    attachments = await Promise.all(
      rows.map(async (a) => {
        const { data: signed } = await supabase.storage
          .from("document-attachments")
          .createSignedUrl(a.storage_path, 3600);
        return {
          id: a.id,
          filename: a.filename,
          size: a.size,
          created_at: a.created_at,
          url: signed?.signedUrl ?? null,
        };
      }),
    );
  }

  return (
    <DocumentEditor
      project={project}
      template={template}
      existing={existing}
      profile={myProfile!}
      samsvarVariant={variant}
      settings={settings}
      participants={participants}
      orgMembers={orgMembers}
      attachments={attachments}
    />
  );
}
