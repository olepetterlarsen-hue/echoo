import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { GroupForm } from "../group-form";
import { MemberPicker } from "./member-picker";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGroupPage({ params }: PageProps) {
  const { id } = await params;
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

  const { t } = await getServerT();

  const [{ data: group }, { data: members }, { data: profiles }] =
    await Promise.all([
      supabase.from("groups").select("*").eq("id", id).single(),
      supabase.from("group_members").select("user_id").eq("group_id", id),
      supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("active", true)
        .order("full_name"),
    ]);
  if (!group) notFound();

  const memberIds = (members ?? []).map((m) => m.user_id);

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <Link
          href="/admin/grupper"
          className="text-text-3 hover:text-text-1 text-sm"
        >
          {t("adm_grp_back_link")}
        </Link>
        <h1 className="text-2xl font-semibold flex items-center gap-2 mt-1">
          <span
            className="inline-block size-3 rounded-full shrink-0 border border-border"
            style={{ backgroundColor: group.color ?? "#9A9AA4" }}
            aria-hidden
          />
          {group.name}
        </h1>
        {group.email && (
          <p className="text-text-2 text-sm font-mono mt-1">{group.email}</p>
        )}
      </header>

      <GroupForm mode="edit" group={group} />

      <Card>
        <CardHeader>
          <CardTitle>
            {t("adm_grp_members_card_title")} ({memberIds.length})
          </CardTitle>
        </CardHeader>
        <CardBody>
          <MemberPicker
            groupId={id}
            allProfiles={profiles ?? []}
            initialMemberIds={memberIds}
          />
        </CardBody>
      </Card>
    </div>
  );
}
