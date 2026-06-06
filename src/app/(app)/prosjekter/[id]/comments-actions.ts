"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { getServerT } from "@/lib/i18n/server";

export async function createComment(input: {
  projectId: string;
  body: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("proj_err_not_signed_in") };

  const trimmed = input.body.trim();
  if (!trimmed) return { error: t("proj_comment_err_empty") };
  if (trimmed.length > 4000)
    return { error: t("proj_comment_err_too_long") };

  const { error } = await supabase.from("project_comments").insert({
    project_id: input.projectId,
    author_id: user.id,
    body: trimmed,
  });
  if (error) return { error: error.message };

  // Send varsel til prosjekt-tildelt + tidligere kommentatorer (unike, ikke forfatter)
  notifyCommentParticipants(supabase, {
    projectId: input.projectId,
    body: trimmed,
    authorId: user.id,
  }).catch(() => {
    // Stille feiling — ikke blokker kommentar-opprettelse
  });

  revalidatePath(`/prosjekter/${input.projectId}`);
  return {};
}

async function notifyCommentParticipants(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  args: { projectId: string; body: string; authorId: string },
) {
  // Finn deltagere: assigned_to på prosjektet + tidligere kommentatorer
  const [{ data: project }, { data: priorComments }, { data: author }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("project_number, title, assigned_to")
        .eq("id", args.projectId)
        .single(),
      supabase
        .from("project_comments")
        .select("author_id")
        .eq("project_id", args.projectId)
        .neq("author_id", args.authorId),
      supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", args.authorId)
        .single(),
    ]);
  if (!project) return;

  const recipientIds = new Set<string>();
  if (project.assigned_to && project.assigned_to !== args.authorId) {
    recipientIds.add(project.assigned_to as string);
  }
  for (const c of priorComments ?? []) {
    if (c.author_id !== args.authorId) recipientIds.add(c.author_id);
  }
  if (recipientIds.size === 0) return;

  const { data: recipients } = await supabase
    .from("profiles")
    .select("id, email, full_name, notify_comment_added")
    .in("id", [...recipientIds]);

  const toNotify = (recipients ?? []).filter(
    (r: { email: string | null; notify_comment_added: boolean }) =>
      r.email && r.notify_comment_added,
  );
  if (toNotify.length === 0) return;

  const authorName = author?.full_name || author?.email || "Noen";
  const projLabel = `${project.title} (#${project.project_number})`;
  const snippet =
    args.body.length > 300 ? args.body.slice(0, 300) + "…" : args.body;

  await Promise.all(
    toNotify.map(
      (r: { email: string | null; full_name: string | null }) =>
        r.email &&
        sendEmail({
          to: r.email,
          subject: `[Echoo] ${authorName} kommenterte på ${project.title}`,
          text: `Hei ${r.full_name?.split(" ")[0] ?? ""}!\n\n${authorName} har skrevet en ny kommentar på prosjektet ${projLabel}:\n\n"${snippet}"\n\nÅpne prosjektet i Echoo for å svare.`,
          category: "comment_added",
          related_project_id: args.projectId,
          sent_by: args.authorId,
        }),
    ),
  );
}

export async function deleteComment(input: {
  commentId: string;
  projectId: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_comments")
    .delete()
    .eq("id", input.commentId);
  if (error) return { error: error.message };

  revalidatePath(`/prosjekter/${input.projectId}`);
  return {};
}
