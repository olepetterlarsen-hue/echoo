"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";

function getClientIp(h: Headers): string {
  // Netlify, Vercel, og de fleste edge-proxyer setter en av disse.
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    h.get("x-real-ip") ??
    h.get("x-nf-client-connection-ip") ??
    h.get("cf-connecting-ip") ??
    "unknown"
  );
}

interface SignupArgs {
  firma: string;
  org_nr: string;
  full_name: string;
  email: string;
  password: string;
  employee_range: string;
  plan?: "base" | "iso";
  newsletter_consent?: boolean;
  is_qualified_signer?: boolean;
}

function parseEmployeeRange(range: string): number | null {
  // "6-20" → 13 (midten). Brukes som estimat i organizations.employee_count_est.
  const m = range.match(/^(\d+)-(\d+)$/);
  if (m) return Math.round((parseInt(m[1], 10) + parseInt(m[2], 10)) / 2);
  if (/^\d+\+$/.test(range)) return parseInt(range.replace("+", ""), 10);
  return null;
}

export async function signUpOrganization(args: SignupArgs) {
  const { t } = await getServerT();
  const firma = args.firma.trim();
  const email = args.email.trim().toLowerCase();
  const fullName = args.full_name.trim();
  const orgNr = args.org_nr.trim();

  if (!firma) return { error: t("signup_err_company_required") };
  if (!email || !args.password) return { error: t("signup_err_credentials_required") };
  if (!fullName) return { error: t("signup_err_name_required") };
  if (args.password.length < 8) return { error: t("signup_err_password_short") };

  const admin = await createAdminClient();

  // Rate limit per IP + epost. Returnerer false hvis blokkert.
  const ip = getClientIp(await headers());
  const { data: allowed, error: rlErr } = await admin.rpc(
    "check_signup_rate_limit",
    { p_ip: ip, p_email: email },
  );
  if (rlErr) {
    return { error: rlErr.message };
  }
  if (allowed === false) {
    return { error: t("signup_err_rate_limited") };
  }

  // 1) Opprett auth-bruker (admin-API for å auto-bekrefte e-post i beta)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: args.password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });
  if (createErr || !created.user) {
    return { error: createErr?.message || t("signup_err_create_user") };
  }
  const userId = created.user.id;

  // 2) Opprett organization + tilknytt brukeren som admin via RPC
  const { data: orgId, error: orgErr } = await admin.rpc("signup_organization", {
    p_user_id: userId,
    p_firma: firma,
    p_org_nr: orgNr || null,
    p_employee_count: parseEmployeeRange(args.employee_range),
    p_full_name: fullName,
  });
  if (orgErr || !orgId) {
    // Rull tilbake bruker hvis org-opprettelse feilet
    await admin.auth.admin.deleteUser(userId);
    return { error: orgErr?.message || t("signup_err_create_org") };
  }

  // 3) Logg på med vanlig client
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: args.password,
  });
  if (signInErr) {
    return { error: signInErr.message };
  }

  // Marker rate-limit-attempt som vellykket (for forensikk)
  await admin.rpc("mark_signup_success", { p_ip: ip, p_email: email });

  // Lagre nyhetsbrev-samtykke på profilen hvis brukeren valgte det
  if (args.newsletter_consent) {
    await admin
      .from("profiles")
      .update({ marketing_consent: true, marketing_consent_at: new Date().toISOString() })
      .eq("id", userId);
  }

  // B5/F-14: la den som registrerer bedriften krysse av at hun selv er
  // installatør/bemyndiget — ellers kommer en enmannsbedrift aldri i mål,
  // siden admin-rollen bevisst ikke gir signeringsrett på samsvarserklæringer.
  if (args.is_qualified_signer) {
    await admin
      .from("profiles")
      .update({ qualified_signer: true })
      .eq("id", userId);
  }

  // Hvis brukeren kom fra landingssiden med plan-valg, send dem rett
  // til auto-checkout. Ellers vanlig onboarding.
  if (args.plan === "base" || args.plan === "iso") {
    redirect(`/admin/abonnement?prefill=${args.plan}&auto_checkout=1`);
  }
  redirect("/onboarding/velkommen");
}
