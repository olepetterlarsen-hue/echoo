/**
 * Felles admin-gate-helpers så vi ikke gjentar samme 8-linjers boilerplate
 * i 30+ filer. To varianter:
 *
 *   requireAdminAction(supabase)  — throws ved feil. Bruk i server actions
 *                                    som returnerer { error }. Wrap i try/catch.
 *   requireAdminPage(supabase)    — redirecter ved feil. Bruk i page.tsx
 *                                    som ikke kan returnere strenger.
 *
 * Begge returnerer { userId, role, orgId } ved suksess.
 */

import { redirect } from "next/navigation";
import type { createClient } from "./server";
import { getCurrentOrgId } from "./org";
import { getServerT } from "@/lib/i18n/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface AdminCtx {
  userId: string;
  orgId: string;
}

/**
 * For server actions. Kaster Error med oversatt melding hvis ikke admin.
 * Caller bør wrappe i try/catch og returnere { error: (e as Error).message }.
 */
export async function requireAdminAction(
  supabase: SupabaseServerClient,
): Promise<AdminCtx> {
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error(t("guard_not_logged_in"));

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error(t("guard_admin_required"));

  const orgId = await getCurrentOrgId(supabase);
  return { userId: user.id, orgId };
}

/**
 * For page.tsx. Redirecter til /login eller /dashboard hvis ikke admin.
 * Caller fortsetter med renderingen kun hvis brukeren er admin.
 */
export async function requireAdminPage(
  supabase: SupabaseServerClient,
): Promise<AdminCtx> {
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

  const orgId = await getCurrentOrgId(supabase);
  return { userId: user.id, orgId };
}
