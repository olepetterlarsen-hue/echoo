"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import type { DocumentKind, Project } from "@/lib/types/database";
import { SAMSVAR_SIGNING_ROLES, DOCUMENT_KIND_LABELS } from "@/lib/types/database";
import { renderDocumentPdf } from "@/lib/pdf/render";
import { getAppSettings } from "@/lib/settings";
import { getServerT } from "@/lib/i18n/server";

interface SaveInput {
  projectId: string | null;
  kind: DocumentKind;
  existingId: string | null;
  data: Record<string, unknown>;
}

async function nextVersion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string | null,
  kind: DocumentKind,
  userId: string,
): Promise<number> {
  let query = supabase
    .from("documents")
    .select("version")
    .eq("kind", kind)
    .order("version", { ascending: false })
    .limit(1);

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    // For frittstående dokumenter: scope versjonering på bruker
    query = query.is("project_id", null).eq("created_by", userId);
  }

  const { data } = await query;
  return (data?.[0]?.version ?? 0) + 1;
}

export async function saveDraft(input: SaveInput): Promise<{
  error?: string;
  documentId?: string;
}> {
  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("proj_err_not_signed_in") };

  if (input.existingId) {
    const { data, error } = await supabase
      .from("documents")
      .update({ data: input.data })
      .eq("id", input.existingId)
      .eq("status", "utkast")
      .select("id")
      .single();
    if (error) return { error: error.message };
    if (input.projectId) revalidatePath(`/prosjekter/${input.projectId}`);
    revalidatePath("/skjemaer");
    return { documentId: data.id };
  }

  const version = await nextVersion(
    supabase,
    input.projectId,
    input.kind,
    user.id,
  );
  let orgId: string;
  try {
    orgId = await getCurrentOrgId(supabase);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { data, error } = await supabase
    .from("documents")
    .insert({
      organization_id: orgId,
      project_id: input.projectId,
      kind: input.kind,
      version,
      status: "utkast",
      data: input.data,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  if (input.projectId) revalidatePath(`/prosjekter/${input.projectId}`);
  revalidatePath("/skjemaer");
  return { documentId: data.id };
}

export async function signDocument(input: SaveInput): Promise<{
  error?: string;
  documentId?: string;
}> {
  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("proj_err_not_signed_in") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile?.signature_data_url) {
    return { error: t("proj_doc_err_no_sig_profile") };
  }

  if (
    input.kind === "samsvarserklaering" &&
    !SAMSVAR_SIGNING_ROLES.includes(profile.role)
  ) {
    return {
      error: t("proj_doc_err_samsvar_role"),
    };
  }

  // Hent prosjekt om dokumentet har det
  let project: Project | null = null;
  if (input.projectId) {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", input.projectId)
      .single();
    project = data;
    if (!project) return { error: t("proj_doc_err_project_not_found") };
  }

  let documentId = input.existingId;

  let orgId: string;
  try {
    orgId = await getCurrentOrgId(supabase);
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (!documentId) {
    const version = await nextVersion(
      supabase,
      input.projectId,
      input.kind,
      user.id,
    );
    const { data, error } = await supabase
      .from("documents")
      .insert({
        organization_id: orgId,
        project_id: input.projectId,
        kind: input.kind,
        version,
        status: "utkast",
        data: input.data,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    documentId = data.id;
  }

  const { data: docPre } = await supabase
    .from("documents")
    .update({ data: input.data })
    .eq("id", documentId!)
    .select("*")
    .single();
  if (!docPre) return { error: t("proj_doc_err_load_failed") };

  // Generer PDF
  const settings = await getAppSettings();
  const pdfBuffer = await renderDocumentPdf({
    document: {
      ...docPre,
      signed_by: user.id,
      signature_snapshot: profile.signature_data_url,
      signed_at: new Date().toISOString(),
    },
    project,
    signer: profile,
    settings,
  });

  const folder = input.projectId ?? `standalone/${user.id}`;
  const pdfPath = `${folder}/${input.kind}/v${docPre.version}-${docPre.id.slice(0, 8)}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(pdfPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadError) return { error: `${t("proj_doc_err_pdf_upload")} ${uploadError.message}` };

  const { error: signError } = await supabase
    .from("documents")
    .update({
      status: "signert",
      signed_by: user.id,
      signed_at: new Date().toISOString(),
      signature_snapshot: profile.signature_data_url,
      pdf_path: pdfPath,
    })
    .eq("id", documentId!);
  if (signError) return { error: signError.message };

  await supabase.from("audit_log").insert({
    organization_id: orgId,
    actor_id: user.id,
    action: "document.signed",
    entity_type: "document",
    entity_id: documentId,
    metadata: {
      kind: input.kind,
      version: docPre.version,
      project_id: input.projectId,
    },
  });

  if (input.projectId) revalidatePath(`/prosjekter/${input.projectId}`);
  revalidatePath("/skjemaer");
  return { documentId };
}

// Starter internkontroll-prosess på et signert dokument.
// Oppretter et nytt internkontroll-dokument koblet til foreldreoppgaven via
// data.parent_document_id, og videresender til redigering.
export async function startInternalControl(input: {
  parentDocumentId: string;
}): Promise<{ documentId?: string; error?: string }> {
  const supabase = await createClient();
  const { t, locale } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("proj_err_not_signed_in") };

  const { data: parent } = await supabase
    .from("documents")
    .select("*")
    .eq("id", input.parentDocumentId)
    .single();
  if (!parent) return { error: t("proj_doc_err_parent_not_found") };
  if (parent.status !== "signert") {
    return {
      error: t("proj_doc_err_internal_only_signed"),
    };
  }

  const parentLabel = DOCUMENT_KIND_LABELS[parent.kind as DocumentKind]?.[locale] ?? parent.kind;
  const referanseTekst = parent.project_id
    ? `${parentLabel} v${parent.version}`
    : `${parentLabel} (${t("proj_doc_standalone_label")}) v${parent.version}`;

  const initialData: Record<string, unknown> = {
    parent_document_id: parent.id,
    parent_kind: parentLabel,
    parent_reference: referanseTekst,
    kontroll_dato: new Date().toISOString().slice(0, 10),
  };

  let orgId: string;
  try {
    orgId = await getCurrentOrgId(supabase);
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Versjon: scope pr. parent_document_id (alltid v1 første gang)
  const { data, error } = await supabase
    .from("documents")
    .insert({
      organization_id: orgId,
      project_id: parent.project_id,
      kind: "internkontroll" as DocumentKind,
      version: 1,
      status: "utkast",
      data: initialData,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (parent.project_id) {
    revalidatePath(`/prosjekter/${parent.project_id}`);
    revalidatePath(`/prosjekter/${parent.project_id}/dokumenter/${parent.kind}`);
  }
  revalidatePath("/skjemaer");
  return { documentId: data.id };
}
