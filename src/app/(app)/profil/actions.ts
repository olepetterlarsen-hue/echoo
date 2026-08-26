"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface SaveProfileInput {
  full_name: string;
  title: string;
  phone: string;
  signature_data_url: string | null;
  notify_deviation_assigned?: boolean;
  notify_comment_added?: boolean;
  notify_task_assigned?: boolean;
  notify_daily_digest?: boolean;
}

export async function saveProfile(input: SaveProfileInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ikke logget inn." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name.trim() || null,
      title: input.title.trim() || null,
      phone: input.phone.trim() || null,
      signature_data_url: input.signature_data_url,
      notify_deviation_assigned: input.notify_deviation_assigned ?? true,
      notify_comment_added: input.notify_comment_added ?? true,
      notify_task_assigned: input.notify_task_assigned ?? true,
      notify_daily_digest: input.notify_daily_digest ?? false,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profil");
}

// A6/I-01: /profil hadde ingen "Endre passord" — eneste vei var "Glemt
// passord?". Krever gjeldende passord (re-autentiserer) før byttet, så en
// kapret, fortsatt-innlogget sesjon ikke kan låse eieren ute permanent.
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ error?: string }> {
  if (input.newPassword.length < 8) {
    return { error: "Passordet må være minst 8 tegn." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Ikke logget inn." };

  const { error: reauthErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  });
  if (reauthErr) return { error: "Feil gjeldende passord." };

  const { error: updateErr } = await supabase.auth.updateUser({
    password: input.newPassword,
  });
  if (updateErr) return { error: updateErr.message };

  // Logg ut andre aktive sesjoner (andre enheter/nettlesere) — denne
  // sesjonen beholdes så brukeren ikke selv blir logget ut.
  await supabase.auth.signOut({ scope: "others" });

  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  return {};
}
