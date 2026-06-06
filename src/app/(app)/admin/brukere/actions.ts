"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
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
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error(t("adm_user_err_missing_admin"));
  return { supabase, user };
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
  try {
    await requireAdmin();
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
    },
  });

  if (error || !data.user) {
    return { error: error?.message ?? t("adm_user_err_create_failed") };
  }

  // Trigger oppretter profilen — vi henter den ferdig fra DB
  const { data: profile } = await admin
    .from("profiles")
    .update({ full_name: input.full_name.trim(), role: input.role })
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
  try {
    await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = await createAdminClient();
  const patch: { role?: UserRole; full_name?: string | null } = {};
  if (input.role) patch.role = input.role;
  if (input.full_name !== undefined) patch.full_name = input.full_name;

  const { data, error } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", input.id)
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
  try {
    await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ active: input.active })
    .eq("id", input.id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/brukere");
  return { profile: data };
}

export async function sendReset(input: { email: string }) {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();
  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? `https://${h.get("host") ?? "localhost:3000"}`;
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${origin}/auth/callback?next=/profil`,
  });
  if (error) return { error: error.message };
  return {};
}
