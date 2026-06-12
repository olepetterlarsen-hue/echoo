"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Supabase MFA TOTP-helpers. Alle bruker SSR-klienten med brukerens egen
 * session — supabase.auth.mfa.* virker da mot riktig brukerkontekst.
 *
 * Flyt:
 *   1. enroll() -> { factor_id, qr_svg, secret }  (UI viser QR)
 *   2. confirm() -> verifiserer engangskode, fjerner "unverified"-flagget,
 *      og hever sesjonens aal2-nivå
 *   3. unenroll() fjerner faktoren
 *   4. listFactors() returnerer alle TOTP-faktorer for brukeren
 *
 * Login-flyt (separat, i /login):
 *   - signInWithPassword
 *   - hvis bruker har verified TOTP-faktor: krev kode -> challengeAndVerify
 */

export async function enrollTotp(): Promise<{
  factor_id?: string;
  qr_svg?: string;
  secret?: string;
  uri?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Echoo TOTP",
  });
  if (error) return { error: error.message };
  return {
    factor_id: data.id,
    qr_svg: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

export async function confirmTotp(args: {
  factor_id: string;
  code: string;
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
  return {};
}

export async function unenrollTotp(args: {
  factor_id: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({
    factorId: args.factor_id,
  });
  if (error) return { error: error.message };
  return {};
}

/**
 * Challenge + verify uten enrollment — brukes ved login eller når
 * sesjonen står på aal1 og må heves til aal2 (f.eks. før admin-tilgang).
 */
export async function challengeAndVerify(args: {
  factor_id: string;
  code: string;
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
  return {};
}
