"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import { guardOrgWritable } from "@/lib/billing";
import { sendEmail } from "@/lib/email/send";
import { geocodeAddress, buildSearchString } from "@/lib/geocode";
import type {
  ProjectStatus,
  DeviationSeverity,
  DeviationStatus,
} from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

// Helper: send avvik-tildelt-varsling. Failer stille — vi vil ikke at
// e-post-feil skal blokkere avvik-opprettelse.
async function notifyDeviationAssigned(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  args: {
    deviationId: string;
    projectId: string;
    title: string;
    assignedTo: string;
    senderId: string;
    severity: DeviationSeverity;
  },
) {
  try {
    if (args.assignedTo === args.senderId) return; // Ikke send til seg selv
    const [{ data: assignee }, { data: project }, { data: sender }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("email, full_name, notify_deviation_assigned")
          .eq("id", args.assignedTo)
          .single(),
        supabase
          .from("projects")
          .select("project_number, title")
          .eq("id", args.projectId)
          .single(),
        supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", args.senderId)
          .single(),
      ]);
    if (!assignee?.email) return;
    if (!assignee.notify_deviation_assigned) return;
    const senderName = sender?.full_name || sender?.email || "Echoo";
    const projLabel = project
      ? `${project.title} (#${project.project_number})`
      : "et prosjekt";
    await sendEmail({
      to: assignee.email,
      subject: `[Echoo] Nytt avvik tildelt: ${args.title}`,
      text: `Hei ${assignee.full_name?.split(" ")[0] ?? ""}!\n\n${senderName} har tildelt deg et avvik:\n\n"${args.title}"\n\nProsjekt: ${projLabel}\nAlvorlighet: ${args.severity}\n\nÅpne avviket i Echoo for å se detaljer og legge inn løsning.`,
      category: "deviation_assigned",
      related_project_id: args.projectId,
      related_deviation_id: args.deviationId,
      sent_by: args.senderId,
    });
  } catch {
    // Stille feiling — ikke blokker hovedflyt
  }
}

export async function updateProjectStatus(input: {
  projectId: string;
  status: ProjectStatus;
}) {
  const supabase = await createClient();
  const patch: { status: ProjectStatus; completed_at?: string } = {
    status: input.status,
  };
  if (input.status === "ferdigstilt") patch.completed_at = new Date().toISOString();
  const { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", input.projectId);
  if (error) return { error: error.message };
  revalidatePath(`/prosjekter/${input.projectId}`);
  revalidatePath("/prosjekter");
}

export async function createDeviation(input: {
  projectId: string;
  title: string;
  description: string;
  severity: DeviationSeverity;
  assigned_to: string | null;
}) {
  const supabase = await createClient();
  const { t } = await getServerT();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
    await guardOrgWritable(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message || t("proj_err_not_signed_in") };
  }

  const { data, error } = await supabase
    .from("deviations")
    .insert({
      organization_id: orgId,
      project_id: input.projectId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      severity: input.severity,
      reported_by: userId,
      assigned_to: input.assigned_to,
    })
    .select(
      "*, reported_by_profile:profiles!deviations_reported_by_fkey(full_name), assigned_to_profile:profiles!deviations_assigned_to_fkey(full_name)",
    )
    .single();

  if (error) return { error: error.message };

  // Send varsling hvis avviket er tildelt en annen bruker
  if (input.assigned_to && data) {
    await notifyDeviationAssigned(supabase, {
      deviationId: data.id,
      projectId: input.projectId,
      title: input.title,
      assignedTo: input.assigned_to,
      senderId: userId,
      severity: input.severity,
    });
  }

  revalidatePath(`/prosjekter/${input.projectId}`);
  revalidatePath("/avvik");
  return { deviation: data };
}

export async function updateDeviation(input: {
  id: string;
  projectId: string;
  status?: DeviationStatus;
  resolution?: string;
  assigned_to?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const { t } = await getServerT();
    return { error: t("proj_err_not_signed_in") };
  }

  const patch: {
    status?: DeviationStatus;
    resolved_at?: string;
    resolved_by?: string;
    resolution?: string;
    assigned_to?: string | null;
  } = {};
  if (input.status) {
    patch.status = input.status;
    if (input.status === "lukket") {
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = user.id;
    }
  }
  if (input.resolution !== undefined) patch.resolution = input.resolution;
  if (input.assigned_to !== undefined) patch.assigned_to = input.assigned_to;

  // Sjekk om assigned_to faktisk endrer seg, så vi kun sender varsel ved ny tildeling
  let priorAssignee: string | null = null;
  if (input.assigned_to !== undefined) {
    const { data: existing } = await supabase
      .from("deviations")
      .select("assigned_to")
      .eq("id", input.id)
      .single();
    priorAssignee = (existing?.assigned_to as string | null) ?? null;
  }

  const { data, error } = await supabase
    .from("deviations")
    .update(patch)
    .eq("id", input.id)
    .select(
      "*, reported_by_profile:profiles!deviations_reported_by_fkey(full_name), assigned_to_profile:profiles!deviations_assigned_to_fkey(full_name)",
    )
    .single();
  if (error) return { error: error.message };

  // Varsle hvis ny tildeling (endret eller fikk verdi)
  if (
    input.assigned_to !== undefined &&
    input.assigned_to !== null &&
    input.assigned_to !== priorAssignee &&
    data
  ) {
    await notifyDeviationAssigned(supabase, {
      deviationId: data.id,
      projectId: input.projectId,
      title: data.title,
      assignedTo: input.assigned_to,
      senderId: user.id,
      severity: data.severity,
    });
  }

  revalidatePath(`/prosjekter/${input.projectId}`);
  revalidatePath("/avvik");
  return { deviation: data };
}

// Legg prosjektet på kartet:
// - hvis det allerede er knyttet til en site med koordinater → no-op (allerede på kart)
// - hvis knyttet til site uten koordinater → geokod den siten
// - hvis kun fritekst-adresse på prosjektet → opprett ny site, link, geokod
export async function addProjectToMap(projectId: string) {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("auth_invalid") };

  const { data: p } = await supabase
    .from("projects")
    .select(
      "id, title, project_number, customer_id, site_id, site_address, site_postal_code, site_city, site_company",
    )
    .eq("id", projectId)
    .single();
  if (!p) return { error: t("proj_err_not_found") };

  // Tilfelle 1: har allerede linked site
  if (p.site_id) {
    const { data: site } = await supabase
      .from("sites")
      .select("id, address, postal_code, city, province, latitude, longitude")
      .eq("id", p.site_id)
      .single();
    if (!site) return { error: t("proj_err_not_found") };
    if (site.latitude != null && site.longitude != null) {
      return { ok: true, alreadyOnMap: true, siteId: site.id };
    }
    const query = buildSearchString({
      address: site.address,
      postal_code: site.postal_code,
      city: site.city,
      province: site.province,
    });
    if (!query || query === "Norway") return { error: t("proj_map_no_address") };
    const result = await geocodeAddress(query);
    if (!result) return { error: t("proj_map_geocode_failed") };
    const { error } = await supabase
      .from("sites")
      .update({ latitude: result.latitude, longitude: result.longitude })
      .eq("id", site.id);
    if (error) return { error: error.message };
    revalidatePath(`/prosjekter/${projectId}`);
    revalidatePath(`/sites/${site.id}`);
    revalidatePath("/kart");
    return { ok: true, siteId: site.id, ...result };
  }

  // Tilfelle 2: kun fritekst-adresse → opprett site, link, geokod
  if (!p.site_address && !p.site_city) {
    return { error: t("proj_map_no_address") };
  }
  const query = buildSearchString({
    address: p.site_address,
    postal_code: p.site_postal_code,
    city: p.site_city,
  });
  if (!query || query === "Norway") return { error: t("proj_map_no_address") };

  const result = await geocodeAddress(query);
  if (!result) return { error: t("proj_map_geocode_failed") };

  let orgIdForSite: string;
  try {
    ({ orgId: orgIdForSite } = await getOrgAndUser(supabase));
  } catch {
    return { error: t("auth_invalid") };
  }

  const siteName = p.site_company || p.site_address || p.title;
  const { data: newSite, error: insertErr } = await supabase
    .from("sites")
    .insert({
      organization_id: orgIdForSite,
      customer_id: p.customer_id,
      name: siteName.slice(0, 120),
      address: p.site_address,
      postal_code: p.site_postal_code,
      city: p.site_city,
      latitude: result.latitude,
      longitude: result.longitude,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (insertErr || !newSite) {
    return { error: insertErr?.message || t("proj_map_geocode_failed") };
  }

  const { error: linkErr } = await supabase
    .from("projects")
    .update({ site_id: newSite.id })
    .eq("id", projectId);
  if (linkErr) return { error: linkErr.message };

  revalidatePath(`/prosjekter/${projectId}`);
  revalidatePath("/sites");
  revalidatePath("/kart");
  return { ok: true, siteId: newSite.id, ...result };
}
