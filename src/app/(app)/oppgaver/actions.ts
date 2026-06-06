"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import type { TaskStatus } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

interface CreateInput {
  title: string;
  description?: string;
  task_type_slug?: string;
  project_id?: string;
  assigned_to?: string;
  group_id?: string;
  due_date?: string;
}

export async function createTask(
  input: CreateInput,
): Promise<{ id?: string; error?: string }> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("task_err_not_logged_in") };

  const trimmed = input.title.trim();
  if (!trimmed) return { error: t("task_err_title_required") };

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: trimmed,
      description: input.description?.trim() || null,
      task_type_slug: input.task_type_slug || null,
      project_id: input.project_id || null,
      assigned_to: input.assigned_to || null,
      group_id: input.group_id || null,
      due_date: input.due_date || null,
      reported_by: user.id,
    })
    .select("id, title")
    .single();
  if (error) return { error: error.message };

  // Send varsling hvis oppgaven har en tildelt person
  if (input.assigned_to && input.assigned_to !== user.id) {
    notifyTaskAssigned(supabase, {
      taskId: data.id,
      title: data.title,
      assignedTo: input.assigned_to,
      senderId: user.id,
      projectId: input.project_id ?? null,
    }).catch(() => {});
  }

  revalidatePath("/oppgaver");
  revalidatePath("/mine-oppgaver");
  if (input.project_id) revalidatePath(`/prosjekter/${input.project_id}`);
  return { id: data.id };
}

export async function updateTask(input: {
  id: string;
  title?: string;
  description?: string;
  task_type_slug?: string | null;
  project_id?: string | null;
  assigned_to?: string | null;
  group_id?: string | null;
  due_date?: string | null;
  status?: TaskStatus;
}): Promise<{ error?: string }> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("task_err_not_logged_in") };

  // Sjekk tidligere assigned_to for varslings-logikk
  let priorAssignee: string | null = null;
  if (input.assigned_to !== undefined) {
    const { data: existing } = await supabase
      .from("tasks")
      .select("assigned_to")
      .eq("id", input.id)
      .single();
    priorAssignee = (existing?.assigned_to as string | null) ?? null;
  }

  const patch: {
    title?: string;
    description?: string | null;
    task_type_slug?: string | null;
    project_id?: string | null;
    assigned_to?: string | null;
    group_id?: string | null;
    due_date?: string | null;
    status?: TaskStatus;
    resolved_at?: string | null;
    resolved_by?: string | null;
  } = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined)
    patch.description = input.description?.trim() || null;
  if (input.task_type_slug !== undefined)
    patch.task_type_slug = input.task_type_slug || null;
  if (input.project_id !== undefined)
    patch.project_id = input.project_id || null;
  if (input.assigned_to !== undefined)
    patch.assigned_to = input.assigned_to || null;
  if (input.group_id !== undefined) patch.group_id = input.group_id || null;
  if (input.due_date !== undefined) patch.due_date = input.due_date || null;
  if (input.status !== undefined) {
    patch.status = input.status;
    if (input.status === "resolved") {
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = user.id;
    } else {
      patch.resolved_at = null;
      patch.resolved_by = null;
    }
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", input.id)
    .select("id, title, project_id")
    .single();
  if (error) return { error: error.message };

  // Varsling ved ny tildeling
  if (
    input.assigned_to !== undefined &&
    input.assigned_to !== null &&
    input.assigned_to !== priorAssignee &&
    input.assigned_to !== user.id
  ) {
    notifyTaskAssigned(supabase, {
      taskId: data.id,
      title: data.title,
      assignedTo: input.assigned_to,
      senderId: user.id,
      projectId: (data.project_id as string | null) ?? null,
    }).catch(() => {});
  }

  revalidatePath("/oppgaver");
  revalidatePath("/mine-oppgaver");
  if (data.project_id) revalidatePath(`/prosjekter/${data.project_id}`);
  return {};
}

export async function deleteTask(input: {
  id: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/oppgaver");
  revalidatePath("/mine-oppgaver");
  return {};
}

async function notifyTaskAssigned(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  args: {
    taskId: string;
    title: string;
    assignedTo: string;
    senderId: string;
    projectId: string | null;
  },
) {
  try {
    const [{ data: assignee }, { data: sender }, projectQuery] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("email, full_name, notify_task_assigned")
          .eq("id", args.assignedTo)
          .single(),
        supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", args.senderId)
          .single(),
        args.projectId
          ? supabase
              .from("projects")
              .select("project_number, title")
              .eq("id", args.projectId)
              .single()
          : Promise.resolve({ data: null }),
      ]);
    if (!assignee?.email || !assignee.notify_task_assigned) return;
    const senderName = sender?.full_name || sender?.email || "Echoo";
    const project = projectQuery?.data;
    const projLabel = project
      ? `\nProsjekt: ${project.title} (#${project.project_number})`
      : "";
    await sendEmail({
      to: assignee.email,
      subject: `[Echoo] Ny oppgave tildelt: ${args.title}`,
      text: `Hei ${assignee.full_name?.split(" ")[0] ?? ""}!\n\n${senderName} har tildelt deg en oppgave:\n\n"${args.title}"${projLabel}\n\nÅpne Echoo for å se detaljer og oppdatere status.`,
      category: "task_assigned",
      related_project_id: args.projectId,
      sent_by: args.senderId,
    });
  } catch {
    // Stille feiling
  }
}
