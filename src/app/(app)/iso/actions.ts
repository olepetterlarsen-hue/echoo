"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import { requireIsoPlan } from "@/lib/billing";
import type {
  ObjectiveKind,
  ObjectiveStatus,
  AspectCategory,
  AspectLifecycle,
  ComplianceStatus,
  AuditFindingSeverity,
  AuditStatus,
  ManagementReviewStatus,
} from "@/lib/types/database";


/* ============================================================
   ISO 9001 7.5 — Dokumentstyring (godkjenningsflyt)
   ============================================================ */

export async function submitDocumentForReview(input: {
  documentId: string;
  changeSummary?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  let userId: string;
  try {
    const ctx = await getOrgAndUser(supabase);
    userId = ctx.userId;
    await requireIsoPlan(supabase, ctx.orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .update({
      status: "under_review",
      submitted_for_review_by: userId,
      submitted_for_review_at: new Date().toISOString(),
      change_summary: input.changeSummary?.trim() || null,
    })
    .eq("id", input.documentId)
    .eq("status", "utkast")
    .select("id, status")
    .single();

  if (docErr) return { error: docErr.message };
  if (!doc) return { error: "Dokumentet er ikke i utkast-status." };

  await supabase.from("document_review_events").insert({
    document_id: input.documentId,
    from_status: "utkast",
    to_status: "under_review",
    actor_id: userId,
    notes: input.changeSummary?.trim() || null,
  });

  revalidatePath("/iso/dokumentstyring");
  revalidatePath("/skjemaer");
  return {};
}

export async function approveDocument(input: {
  documentId: string;
  notes?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  let userId: string;
  try {
    const ctx = await getOrgAndUser(supabase);
    userId = ctx.userId;
    await requireIsoPlan(supabase, ctx.orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Sjekk rolle — kun admin/installator/bemyndiget kan godkjenne
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (!me || !["admin", "installator", "bemyndiget"].includes(me.role)) {
    return { error: "Mangler godkjenningsrettighet." };
  }

  const { error } = await supabase
    .from("documents")
    .update({
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
      approval_notes: input.notes?.trim() || null,
    })
    .eq("id", input.documentId)
    .eq("status", "under_review");

  if (error) return { error: error.message };

  await supabase.from("document_review_events").insert({
    document_id: input.documentId,
    from_status: "under_review",
    to_status: "approved",
    actor_id: userId,
    notes: input.notes?.trim() || null,
  });

  revalidatePath("/iso/dokumentstyring");
  revalidatePath("/skjemaer");
  return {};
}

export async function rejectDocument(input: {
  documentId: string;
  reason: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  let userId: string;
  try {
    const ctx = await getOrgAndUser(supabase);
    userId = ctx.userId;
    await requireIsoPlan(supabase, ctx.orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!input.reason.trim()) {
    return { error: "Begrunnelse er påkrevd ved avvisning." };
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (!me || !["admin", "installator", "bemyndiget"].includes(me.role)) {
    return { error: "Mangler godkjenningsrettighet." };
  }

  const { error } = await supabase
    .from("documents")
    .update({
      status: "rejected",
      rejected_by: userId,
      rejected_at: new Date().toISOString(),
      rejection_reason: input.reason.trim(),
    })
    .eq("id", input.documentId)
    .eq("status", "under_review");

  if (error) return { error: error.message };

  await supabase.from("document_review_events").insert({
    document_id: input.documentId,
    from_status: "under_review",
    to_status: "rejected",
    actor_id: userId,
    notes: input.reason.trim(),
  });

  revalidatePath("/iso/dokumentstyring");
  revalidatePath("/skjemaer");
  return {};
}

/* ============================================================
   ISO 9001 10.2 — CAPA på avvik
   ============================================================ */

interface CapaInput {
  deviationId: string;
  root_cause_category?: string;
  root_cause_description?: string;
  containment_action?: string;
  corrective_action?: string;
  responsible_id?: string;
  due_date?: string;
  verification_evidence?: string;
  verify?: boolean; // markerer verified_by/verified_at
}

export async function updateCapa(
  input: CapaInput,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  let userId: string;
  try {
    const ctx = await getOrgAndUser(supabase);
    userId = ctx.userId;
    await requireIsoPlan(supabase, ctx.orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const patch: import("@/lib/types/database").Database["public"]["Tables"]["deviations"]["Update"] = {};
  if (input.root_cause_category !== undefined) {
    patch.root_cause_category =
      (input.root_cause_category as import("@/lib/types/database").DeviationRootCauseCategory) ||
      null;
  }
  if (input.root_cause_description !== undefined) {
    patch.root_cause_description = input.root_cause_description?.trim() || null;
  }
  if (input.containment_action !== undefined) {
    const v = input.containment_action?.trim();
    patch.containment_action = v || null;
    if (v) {
      patch.containment_by = userId;
      patch.containment_at = new Date().toISOString();
    }
  }
  if (input.corrective_action !== undefined) {
    patch.corrective_action = input.corrective_action?.trim() || null;
  }
  if (input.responsible_id !== undefined) {
    patch.responsible_id = input.responsible_id || null;
  }
  if (input.due_date !== undefined) {
    patch.due_date = input.due_date || null;
  }
  if (input.verification_evidence !== undefined) {
    patch.verification_evidence = input.verification_evidence?.trim() || null;
  }
  if (input.verify) {
    patch.verified_by = userId;
    patch.verified_at = new Date().toISOString();
  }

  const { error, data } = await supabase
    .from("deviations")
    .update(patch)
    .eq("id", input.deviationId)
    .select("id, project_id")
    .single();
  if (error) return { error: error.message };

  if (data?.project_id) revalidatePath(`/prosjekter/${data.project_id}`);
  revalidatePath("/avvik");
  return {};
}

/* ============================================================
   ISO 9001 6.2 — Objectives & KPI register
   ============================================================ */

interface ObjectiveInput {
  id?: string;
  kind: ObjectiveKind;
  title: string;
  description?: string;
  target_value?: string;
  unit?: string;
  baseline_value?: number | null;
  current_value?: number | null;
  target_numeric?: number | null;
  start_date?: string;
  deadline?: string;
  responsible_id?: string;
  status?: ObjectiveStatus;
  measurement_method?: string;
}

export async function upsertObjective(
  input: ObjectiveInput,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
    await requireIsoPlan(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!input.title.trim()) return { error: "Tittel er påkrevd." };

  const payload = {
    kind: input.kind,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    target_value: input.target_value?.trim() || null,
    unit: input.unit?.trim() || null,
    baseline_value: input.baseline_value ?? null,
    current_value: input.current_value ?? null,
    target_numeric: input.target_numeric ?? null,
    start_date: input.start_date || new Date().toISOString().slice(0, 10),
    deadline: input.deadline || null,
    responsible_id: input.responsible_id || null,
    status: input.status ?? "active",
    measurement_method: input.measurement_method?.trim() || null,
  };

  if (input.id) {
    const { error } = await supabase
      .from("iso_objectives")
      .update(payload)
      .eq("id", input.id);
    if (error) return { error: error.message };
    revalidatePath("/iso/maal");
    revalidatePath(`/iso/maal/${input.id}`);
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("iso_objectives")
    .insert({ ...payload, organization_id: orgId, created_by: userId })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/iso/maal");
  return { id: data.id };
}

export async function recordObjectiveMeasurement(input: {
  objectiveId: string;
  value: number;
  notes?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
    await requireIsoPlan(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error: insertErr } = await supabase
    .from("iso_objective_measurements")
    .insert({
      organization_id: orgId,
      objective_id: input.objectiveId,
      value: input.value,
      notes: input.notes?.trim() || null,
      recorded_by: userId,
    });
  if (insertErr) return { error: insertErr.message };

  // Oppdater current_value på objective
  await supabase
    .from("iso_objectives")
    .update({ current_value: input.value })
    .eq("id", input.objectiveId);

  revalidatePath(`/iso/maal/${input.objectiveId}`);
  revalidatePath("/iso/maal");
  return {};
}

/* ============================================================
   ISO 9001 9.2 — Internal audit
   ============================================================ */

interface AuditPlanInput {
  id?: string;
  title: string;
  scope: string;
  auditor_id?: string;
  external_auditor_name?: string;
  planned_date: string;
  completed_date?: string;
  status?: AuditStatus;
  checklist_template_id?: string;
  checklist_responses?: Record<string, unknown>;
  summary?: string;
}

export async function upsertAuditPlan(
  input: AuditPlanInput,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
    await requireIsoPlan(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!input.title.trim()) return { error: "Tittel er påkrevd." };
  if (!input.scope.trim()) return { error: "Omfang er påkrevd." };

  const payload = {
    title: input.title.trim(),
    scope: input.scope.trim(),
    auditor_id: input.auditor_id || null,
    external_auditor_name: input.external_auditor_name?.trim() || null,
    planned_date: input.planned_date,
    completed_date: input.completed_date || null,
    status: input.status ?? "planned",
    checklist_template_id: input.checklist_template_id || null,
    checklist_responses: input.checklist_responses ?? {},
    summary: input.summary?.trim() || null,
  };

  if (input.id) {
    const { error } = await supabase
      .from("audit_plans")
      .update(payload)
      .eq("id", input.id);
    if (error) return { error: error.message };
    revalidatePath("/iso/revisjoner");
    revalidatePath(`/iso/revisjoner/${input.id}`);
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("audit_plans")
    .insert({ ...payload, organization_id: orgId, created_by: userId })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/iso/revisjoner");
  return { id: data.id };
}

export async function createAuditFinding(input: {
  audit_plan_id: string;
  title: string;
  description?: string;
  severity?: AuditFindingSeverity;
  reference?: string;
  createLinkedDeviation?: boolean;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
    await requireIsoPlan(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { data: finding, error } = await supabase
    .from("audit_findings")
    .insert({
      organization_id: orgId,
      audit_plan_id: input.audit_plan_id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      severity: input.severity ?? "observation",
      reference: input.reference?.trim() || null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Hvis bruker ber om det, opprett en koblet avvik-rad så CAPA-flyten kan starte
  if (input.createLinkedDeviation) {
    // Trenger et placeholder-prosjekt — bruker første aktive eller skipper kobling
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("organization_id", orgId)
      .eq("status", "aktiv")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (project) {
      const sev =
        input.severity === "critical"
          ? "kritisk"
          : input.severity === "major"
            ? "hoey"
            : input.severity === "minor"
              ? "middels"
              : "lav";

      const { data: deviation } = await supabase
        .from("deviations")
        .insert({
          organization_id: orgId,
          project_id: project.id,
          title: `Revisjonsfunn: ${input.title.trim()}`,
          description: input.description?.trim() || null,
          severity: sev,
          reported_by: userId,
        })
        .select("id")
        .single();

      if (deviation) {
        await supabase
          .from("audit_findings")
          .update({ linked_deviation_id: deviation.id })
          .eq("id", finding.id);
      }
    }
  }

  revalidatePath(`/iso/revisjoner/${input.audit_plan_id}`);
  revalidatePath("/iso/revisjoner");
  return { id: finding.id };
}

/* ============================================================
   ISO 9001 9.3 — Management review
   ============================================================ */

const DEFAULT_AGENDA = [
  { key: "previous_actions", title: "Status på handlinger fra forrige gjennomgang" },
  { key: "internal_external_issues", title: "Endringer i interne/eksterne forhold" },
  { key: "performance", title: "Resultat av kvalitets-/miljøsystemet" },
  { key: "deviations", title: "Avvik og korrigerende tiltak" },
  { key: "audit_results", title: "Revisjonsresultater" },
  { key: "compliance", title: "Etterlevelse av lovkrav" },
  { key: "objectives", title: "Mål og KPI-status" },
  { key: "resources", title: "Ressurser" },
  { key: "improvement", title: "Forbedringsmuligheter" },
];

export async function createManagementReview(input: {
  title: string;
  scheduled_date: string;
  participants?: string;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
    await requireIsoPlan(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Hent input-snapshot via security-definer-funksjonen
  const { data: snapshot } = await supabase.rpc("management_review_inputs", {
    p_org_id: orgId,
  });

  const { data, error } = await supabase
    .from("management_reviews")
    .insert({
      organization_id: orgId,
      title: input.title.trim(),
      scheduled_date: input.scheduled_date,
      participants: input.participants?.trim() || null,
      agenda: DEFAULT_AGENDA,
      inputs_snapshot: (snapshot as Record<string, unknown>) ?? {},
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/iso/ledelsens-gjennomgang");
  return { id: data.id };
}

export async function updateManagementReview(input: {
  id: string;
  decisions?: string;
  status?: ManagementReviewStatus;
  next_review_date?: string;
  completed_date?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    const ctx = await getOrgAndUser(supabase);
    await requireIsoPlan(supabase, ctx.orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const patch: import("@/lib/types/database").Database["public"]["Tables"]["management_reviews"]["Update"] = {};
  if (input.decisions !== undefined)
    patch.decisions = input.decisions.trim() || null;
  if (input.status) patch.status = input.status;
  if (input.next_review_date !== undefined)
    patch.next_review_date = input.next_review_date || null;
  if (input.completed_date !== undefined)
    patch.completed_date = input.completed_date || null;

  const { error } = await supabase
    .from("management_reviews")
    .update(patch)
    .eq("id", input.id);
  if (error) return { error: error.message };

  revalidatePath(`/iso/ledelsens-gjennomgang/${input.id}`);
  revalidatePath("/iso/ledelsens-gjennomgang");
  return {};
}

/* ============================================================
   ISO 14001 6.1.2 — Environmental aspects
   ============================================================ */

interface AspectInput {
  id?: string;
  title: string;
  description?: string;
  category: AspectCategory;
  lifecycle?: AspectLifecycle;
  frequency_score?: number;
  severity_score?: number;
  is_significant?: boolean;
  control_measures?: string;
  linked_substance_id?: string;
  responsible_id?: string;
}

export async function upsertAspect(
  input: AspectInput,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
    await requireIsoPlan(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!input.title.trim()) return { error: "Tittel er påkrevd." };

  const payload = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    category: input.category,
    lifecycle: input.lifecycle ?? "normal",
    frequency_score: input.frequency_score ?? null,
    severity_score: input.severity_score ?? null,
    is_significant: input.is_significant ?? false,
    control_measures: input.control_measures?.trim() || null,
    linked_substance_id: input.linked_substance_id || null,
    responsible_id: input.responsible_id || null,
    reviewed_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase
      .from("env_aspects")
      .update(payload)
      .eq("id", input.id);
    if (error) return { error: error.message };
    revalidatePath("/iso/miljoaspekter");
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("env_aspects")
    .insert({ ...payload, organization_id: orgId, created_by: userId })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/iso/miljoaspekter");
  return { id: data.id };
}

/* ============================================================
   ISO 14001 6.1.3 — Compliance obligations
   ============================================================ */

interface ComplianceInput {
  id?: string;
  regulation: string;
  requirement: string;
  reference_url?: string;
  responsible_id?: string;
  evidence_url?: string;
  status?: ComplianceStatus;
  next_review_date?: string;
  notes?: string;
}

export async function upsertCompliance(
  input: ComplianceInput,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
    await requireIsoPlan(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!input.regulation.trim() || !input.requirement.trim()) {
    return { error: "Lov/forskrift og krav er påkrevd." };
  }

  const payload = {
    regulation: input.regulation.trim(),
    requirement: input.requirement.trim(),
    reference_url: input.reference_url?.trim() || null,
    responsible_id: input.responsible_id || null,
    evidence_url: input.evidence_url?.trim() || null,
    status: input.status ?? "under_review",
    next_review_date: input.next_review_date || null,
    notes: input.notes?.trim() || null,
  };

  if (input.id) {
    const { error } = await supabase
      .from("compliance_obligations")
      .update(payload)
      .eq("id", input.id);
    if (error) return { error: error.message };
    revalidatePath("/iso/etterlevelse");
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("compliance_obligations")
    .insert({ ...payload, organization_id: orgId, created_by: userId })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/iso/etterlevelse");
  return { id: data.id };
}
