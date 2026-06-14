import { createClient } from "@/lib/supabase/server";
import { ELEVATED_ROLES, type UserRole } from "@/lib/types/database";
import { KompetanseTabNav } from "./tab-nav";

export default async function KompetanseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();
  const canManageAll = ELEVATED_ROLES.includes(
    (me?.role ?? "elektriker") as UserRole,
  );

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-4">
      <KompetanseTabNav canManageAll={canManageAll} />
      {children}
    </div>
  );
}
