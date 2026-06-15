import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { CheckSquare, ListChecks, LayoutGrid, Tag } from "lucide-react";
import { getServerT } from "@/lib/i18n/server";
import { TaskTypesClient } from "./types-client";

export default async function TaskTypesPage() {
  const { t, locale } = await getServerT();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  const { data: types } = await supabase
    .from("task_types")
    .select("id, slug, label_no, label_en, order_index, is_active")
    .order("order_index", { ascending: true })
    .order("label_no", { ascending: true });

  // Tell hvor mange tasks som bruker hver type
  const { data: usageRows } = await supabase
    .from("tasks")
    .select("task_type_slug");
  const usageBySlug = new Map<string, number>();
  for (const r of usageRows ?? []) {
    const slug = (r as { task_type_slug: string | null }).task_type_slug;
    if (!slug) continue;
    usageBySlug.set(slug, (usageBySlug.get(slug) ?? 0) + 1);
  }

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Tag className="size-6 text-text-2" />
            {t("task_types_title")}
          </h1>
          <p className="text-text-2 text-sm">{t("task_types_subtitle")}</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border -mx-6 px-6">
        <nav className="flex gap-1">
          <TabLink
            href="/oppgaver?view=mine"
            active={false}
            icon={<CheckSquare className="size-4" />}
            label={t("task_tab_mine")}
          />
          <TabLink
            href="/oppgaver?view=alle"
            active={false}
            icon={<ListChecks className="size-4" />}
            label={t("task_tab_all")}
          />
          <TabLink
            href="/oppgaver?view=tavle"
            active={false}
            icon={<LayoutGrid className="size-4" />}
            label={t("task_tab_board")}
          />
          <TabLink
            href="/oppgaver/typer"
            active={true}
            icon={<Tag className="size-4" />}
            label={t("task_tab_types")}
          />
        </nav>
      </div>

      {!isAdmin && (
        <Card>
          <CardBody className="text-sm text-text-2">
            {t("task_types_admin_only")}
          </CardBody>
        </Card>
      )}

      <TaskTypesClient
        types={(types ?? []).map((tp) => ({
          ...tp,
          usage_count: usageBySlug.get(tp.slug) ?? 0,
        }))}
        canEdit={isAdmin}
        locale={locale}
      />
    </div>
  );
}

function TabLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-orange text-orange"
          : "border-transparent text-text-2 hover:text-text-1"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
