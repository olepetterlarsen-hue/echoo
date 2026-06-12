"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { guardOrgWritable } from "@/lib/billing";
import { getAppOrigin } from "@/lib/origin";
import { getServerT } from "@/lib/i18n/server";
import type { Profile, UserRole } from "@/lib/types/database";

async function requireAdmin() {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error(t("adm_user_err_not_logged_in"));
  const { data: me } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error(t("adm_user_err_missing_admin"));
  if (!me.organization_id) {
    throw new Error(t("adm_user_err_no_org"));
  }
  return { supabase, user, orgId: me.organization_id as string };
}

interface CreateInput {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export async function createUser(input: CreateInput): Promise<{
  error?: string;
  profile?: Profile;
}> {
  let orgId: string;
  let userSupabase: Awaited<ReturnType<typeof createClient>>;
  try {
    const ctx = await requireAdmin();
    orgId = ctx.orgId;
    userSupabase = ctx.supabase;
    await guardOrgWritable(userSupabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { t } = await getServerT();
  const admin = await createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name.trim(),
      role: input.role,
      // handle_new_user-trigger (migration 041) plukker dette opp og
      // setter profile.organization_id direkte, så invited user havner
      // i samme org som admin.
      organization_id: orgId,
    },
  });

  if (error || !data.user) {
    return { error: error?.message ?? t("adm_user_err_create_failed") };
  }

  // Trigger oppretter profilen — vi oppdaterer med korrekt navn/rolle/org
  // som defense in depth. Filter på org_id sikrer at admin ikke kan
  // overskrive en bruker i en annen org via race condition.
  const { data: profile } = await admin
    .from("profiles")
    .update({
      full_name: input.full_name.trim(),
      role: input.role,
      organization_id: orgId,
    })
    .eq("id", data.user.id)
    .select()
    .single();

  revalidatePath("/admin/brukere");
  return { profile: profile ?? undefined };
}

interface UpdateInput {
  id: string;
  role?: UserRole;
  full_name?: string;
}

export async function updateUser(input: UpdateInput): Promise<{
  error?: string;
  profile?: Profile;
}> {
  let orgId: string;
  try {
    ({ orgId } = await requireAdmin());
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = await createAdminClient();
  const patch: { role?: UserRole; full_name?: string | null } = {};
  if (input.role) patch.role = input.role;
  if (input.full_name !== undefined) patch.full_name = input.full_name;

  // Org-scope: admin kan kun oppdatere brukere i egen org. Vi bruker
  // admin-client som bypasser RLS, så org-filteret er den eneste
  // beskyttelsen mot kryss-org-skriving.
  const { data, error } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", input.id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/brukere");
  return { profile: data };
}

export async function toggleActive(input: {
  id: string;
  active: boolean;
}): Promise<{ error?: string; profile?: Profile }> {
  let orgId: string;
  try {
    ({ orgId } = await requireAdmin());
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ active: input.active })
    .eq("id", input.id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/brukere");
  return { profile: data };
}

export async function sendReset(input: { email: string }) {
  let orgId: string;
  try {
    ({ orgId } = await requireAdmin());
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();

  // Sjekk at den oppgitte e-posten faktisk tilhører admin sin org.
  // Forhindrer at admin sender reset til brukere i andre orgs.
  const { data: target } = await supabase
    .from("profiles")
    .select("id, organization_id")
    .eq("email", input.email.trim().toLowerCase())
    .maybeSingle();
  if (!target || target.organization_id !== orgId) {
    const { t } = await getServerT();
    return { error: t("adm_user_err_not_in_org") };
  }

  const origin = await getAppOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${origin}/auth/callback?next=/profil`,
  });
  if (error) return { error: error.message };
  return {};
}
