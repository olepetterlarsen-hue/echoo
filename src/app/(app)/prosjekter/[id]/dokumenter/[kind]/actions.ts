"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { guardOrgWritable, checkStorageQuota } from "@/lib/billing";
import type { DocumentKind, DocumentRow, Project } from "@/lib/types/database";
import {
  canSignSamsvar,
  DOCUMENT_KIND_LABELS,
  PARTICIPANT_SIGNING_KINDS,
} from "@/lib/types/database";
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
    !canSignSamsvar(profile.role, profile.qualified_signer)
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
    await guardOrgWritable(supabase, orgId);
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

  // Hent eventuelle deltaker-signaturer (f.eks. SJA) til PDF-en
  const { data: participantRows } = await supabase
    .from("document_participants")
    .select(
      "status, signed_at, signed_name, signature_snapshot, profile:profiles!document_participants_profile_id_fkey(full_name, email)",
    )
    .eq("document_id", documentId!)
    .order("created_at");
  const participants = (participantRows ?? []).map((row) => {
    const p = row.profile as unknown as {
      full_name: string | null;
      email: string;
    } | null;
    return {
      name: row.signed_name ?? p?.full_name ?? p?.email ?? "",
      signedAt: row.signed_at,
      signature: row.signature_snapshot,
    };
  });

  // Generer PDF
  const settings = await getAppSettings();
  const pdfBuffer = await renderDocumentPdf({
    document: {
      ...docPre,
      status: "signert",
      signed_by: user.id,
      signature_snapshot: profile.signature_data_url,
      signed_at: new Date().toISOString(),
    },
    project,
    signer: profile,
    settings,
    participants,
  });

  const folder = input.projectId ?? `standalone/${user.id}`;
  const pdfPath = `${folder}/${input.kind}/v${docPre.version}-${docPre.id.slice(0, 8)}.pdf`;

  // Sjekk lagringskvote før PDF lastes opp.
  const quota = await checkStorageQuota(supabase, orgId, pdfBuffer.byteLength);
  if (!quota.ok) {
    return {
      error: `Lagringskvoten er nådd (${Math.round(quota.used / 1024 ** 3)} GB av ${Math.round(quota.quota / 1024 ** 3)} GB). Oppgrader abonnementet i /admin/abonnement.`,
    };
  }

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

// ---------------------------------------------------------------------------
// Deltaker-signering (f.eks. SJA): flere personer signerer samme dokument.
// Forespørsel oppretter en oppgave på deltakerens «Mine oppgaver»; når
// deltakeren signerer, løses oppgaven automatisk.
// ---------------------------------------------------------------------------

function documentPath(
  projectId: string | null,
  kind: DocumentKind,
  documentId: string,
): string {
  return projectId
    ? `/prosjekter/${projectId}/dokumenter/${kind}`
    : `/skjemaer/${documentId}`;
}

export async function addDocumentParticipants(
  input: SaveInput & { profileIds: string[] },
): Promise<{ error?: string; documentId?: string }> {
  const supabase = await createClient();
  const { t, locale } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("proj_err_not_signed_in") };

  if (!PARTICIPANT_SIGNING_KINDS.includes(input.kind)) {
    return { error: t("proj_doc_participants_err_kind") };
  }
  if (input.profileIds.length === 0) {
    return { error: t("proj_doc_participants_err_none") };
  }

  // Sørg for at dokumentet finnes (lagre utkast først om nødvendig)
  const saved = await saveDraft(input);
  if (saved.error || !saved.documentId) {
    return { error: saved.error ?? t("proj_doc_err_load_failed") };
  }
  const documentId = saved.documentId;

  let orgId: string;
  try {
    orgId = await getCurrentOrgId(supabase);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { data: requester } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();
  const requesterName = requester?.full_name ?? requester?.email ?? "";

  let projectLabel = "";
  if (input.projectId) {
    const { data: proj } = await supabase
      .from("projects")
      .select("project_number, title")
      .eq("id", input.projectId)
      .single();
    if (proj) projectLabel = `${proj.project_number} ${proj.title}`;
  }

  // Hopp over profiler som allerede er deltakere på dokumentet
  const { data: existingRows } = await supabase
    .from("document_participants")
    .select("profile_id")
    .eq("document_id", documentId);
  const already = new Set((existingRows ?? []).map((r) => r.profile_id));
  const newIds = input.profileIds.filter((pid) => !already.has(pid));

  const kindLabel = DOCUMENT_KIND_LABELS[input.kind]?.[locale] ?? input.kind;
  const path = documentPath(input.projectId, input.kind, documentId);

  for (const profileId of newIds) {
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        title: projectLabel
          ? `${t("proj_doc_participants_task_title")} ${kindLabel} – ${projectLabel}`
          : `${t("proj_doc_participants_task_title")} ${kindLabel}`,
        description: `${t("proj_doc_participants_task_desc").replace("{name}", requesterName).replace("{kind}", kindLabel)}\n\n${path}`,
        assigned_to: profileId,
        reported_by: user.id,
        project_id: input.projectId,
        organization_id: orgId,
      })
      .select("id")
      .single();
    if (taskError) return { error: taskError.message };

    const { error: partError } = await supabase
      .from("document_participants")
      .insert({
        organization_id: orgId,
        document_id: documentId,
        profile_id: profileId,
        requested_by: user.id,
        task_id: task.id,
      });
    if (partError) return { error: partError.message };
  }

  if (input.projectId) {
    revalidatePath(`/prosjekter/${input.projectId}/dokumenter/${input.kind}`);
    revalidatePath(`/prosjekter/${input.projectId}`);
  }
  revalidatePath("/mine-oppgaver");
  revalidatePath("/oppgaver");
  return { documentId };
}

export async function signAsParticipant(input: {
  participantId: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("proj_err_not_signed_in") };

  const { data: participant } = await supabase
    .from("document_participants")
    .select("*, document:documents(*)")
    .eq("id", input.participantId)
    .single();
  if (!participant) return { error: t("proj_doc_participants_err_not_found") };
  if (participant.profile_id !== user.id) {
    return { error: t("proj_doc_participants_err_not_you") };
  }
  if (participant.status === "signert") {
    return { error: t("proj_doc_participants_err_already") };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, signature_data_url")
    .eq("id", user.id)
    .single();
  if (!profile?.signature_data_url) {
    return { error: t("proj_doc_err_no_sig_profile") };
  }

  const { error: updateError } = await supabase
    .from("document_participants")
    .update({
      status: "signert",
      signed_at: new Date().toISOString(),
      signed_name: profile.full_name ?? profile.email,
      signature_snapshot: profile.signature_data_url,
    })
    .eq("id", input.participantId)
    .eq("status", "ventende");
  if (updateError) return { error: updateError.message };

  // Løs den tilhørende oppgaven automatisk
  if (participant.task_id) {
    await supabase
      .from("tasks")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq("id", participant.task_id);
  }

  const doc = participant.document as unknown as DocumentRow | null;

  // Er dokumentet allerede signert av ansvarlig, må PDF-en regenereres slik
  // at deltakersignaturen kommer med i det arkiverte dokumentet.
  if (doc && doc.status === "signert" && doc.pdf_path && doc.signed_by) {
    try {
      const [{ data: docSigner }, { data: docProject }, settings, { data: allParts }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", doc.signed_by).single(),
          doc.project_id
            ? supabase.from("projects").select("*").eq("id", doc.project_id).single()
            : Promise.resolve({ data: null }),
          getAppSettings(),
          supabase
            .from("document_participants")
            .select(
              "status, signed_at, signed_name, signature_snapshot, profile:profiles!document_participants_profile_id_fkey(full_name, email)",
            )
            .eq("document_id", doc.id)
            .order("created_at"),
        ]);
      if (docSigner) {
        const pdfBuffer = await renderDocumentPdf({
          document: doc,
          project: docProject,
          signer: docSigner,
          settings,
          participants: (allParts ?? []).map((row) => {
            const p = row.profile as unknown as {
              full_name: string | null;
              email: string;
            } | null;
            return {
              name: row.signed_name ?? p?.full_name ?? p?.email ?? "",
              signedAt: row.signed_at,
              signature: row.signature_snapshot,
            };
          }),
        });
        await supabase.storage
          .from("documents")
          .upload(doc.pdf_path, pdfBuffer, {
            contentType: "application/pdf",
            upsert: true,
          });
      }
    } catch {
      // PDF-regenerering skal ikke blokkere selve signeringen
    }
  }

  try {
    const orgId = await getCurrentOrgId(supabase);
    await supabase.from("audit_log").insert({
      organization_id: orgId,
      actor_id: user.id,
      action: "document.participant_signed",
      entity_type: "document",
      entity_id: doc?.id ?? participant.document_id,
      metadata: { kind: doc?.kind, project_id: doc?.project_id },
    });
  } catch {
    // Audit-logg skal ikke blokkere signeringen
  }

  if (doc?.project_id) {
    revalidatePath(`/prosjekter/${doc.project_id}/dokumenter/${doc.kind}`);
    revalidatePath(`/prosjekter/${doc.project_id}`);
  }
  revalidatePath("/mine-oppgaver");
  revalidatePath("/oppgaver");
  return {};
}

export async function removeDocumentParticipant(input: {
  participantId: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("proj_err_not_signed_in") };

  const { data: participant } = await supabase
    .from("document_participants")
    .select("*, document:documents(kind, project_id)")
    .eq("id", input.participantId)
    .single();
  if (!participant) return { error: t("proj_doc_participants_err_not_found") };
  if (participant.status === "signert") {
    // Signerte deltakerrader er compliance-spor og kan ikke fjernes
    return { error: t("proj_doc_participants_err_remove_signed") };
  }

  const { error: deleteError } = await supabase
    .from("document_participants")
    .delete()
    .eq("id", input.participantId)
    .eq("status", "ventende");
  if (deleteError) return { error: deleteError.message };

  if (participant.task_id) {
    await supabase.from("tasks").delete().eq("id", participant.task_id);
  }

  const doc = participant.document as unknown as {
    kind: DocumentKind;
    project_id: string | null;
  } | null;
  if (doc?.project_id) {
    revalidatePath(`/prosjekter/${doc.project_id}/dokumenter/${doc.kind}`);
  }
  revalidatePath("/mine-oppgaver");
  revalidatePath("/oppgaver");
  return {};
}
