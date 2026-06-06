"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

interface SignInInput {
  email: string;
  password: string;
  redirectTo?: string;
}

export async function signIn({ email, password, redirectTo }: SignInInput) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Feil e-post eller passord." };
  }

  redirect(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

interface ResetInput {
  email: string;
}

export async function requestPasswordReset({ email }: ResetInput) {
  const supabase = await createClient();
  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? `https://${h.get("host") ?? "localhost:3000"}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/profil`,
  });
  if (error) return { error: "Klarte ikke sende tilbakestillingslenke." };
}
