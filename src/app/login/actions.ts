"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/origin";

interface SignInInput {
  email: string;
  password: string;
  redirectTo?: string;
}

export type SignInResult =
  | { error: string }
  | { mfa_required: true; factor_id: string };

export async function signIn({
  email,
  password,
  redirectTo,
}: SignInInput): Promise<SignInResult | void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Feil e-post eller passord." };
  }

  // Sjekk om brukeren har en verified TOTP-faktor. Supabase sender
  // currentLevel='aal1' og nextLevel='aal2' når MFA finnes men ikke er
  // verifisert i denne sesjonen.
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal1" && aal.nextLevel === "aal2") {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.find((f) => f.status === "verified");
    if (totp) {
      return { mfa_required: true, factor_id: totp.id };
    }
  }

  // Echoo-staff uten kunde-org → /team. Hybrid (har begge) → kunde-app.
  const dest = await resolveLoginDestination(supabase, redirectTo);
  redirect(dest);
}

async function resolveLoginDestination(
  supabase: Awaited<ReturnType<typeof createClient>>,
  redirectTo?: string,
): Promise<string> {
  if (redirectTo && redirectTo.startsWith("/")) return redirectTo;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/dashboard";
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, is_echoo_staff")
    .eq("id", user.id)
    .single();
  if (profile?.is_echoo_staff && !profile.organization_id) return "/team";
  return "/dashboard";
}

export async function completeMfaSignIn(args: {
  factor_id: string;
  code: string;
  redirectTo?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const code = args.code.trim();
  if (!/^\d{6}$/.test(code)) {
    return { error: "Koden må være 6 sifre." };
  }
  const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
    factorId: args.factor_id,
  });
  if (chErr) return { error: chErr.message };
  const { error: verErr } = await supabase.auth.mfa.verify({
    factorId: args.factor_id,
    challengeId: challenge.id,
    code,
  });
  if (verErr) return { error: verErr.message };
  redirect(await resolveLoginDestination(supabase, args.redirectTo));
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
  const origin = await getAppOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/profil`,
  });
  if (error) return { error: "Klarte ikke sende tilbakestillingslenke." };
}
