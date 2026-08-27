"use server";

import { randomBytes } from "crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { renderContractPdf } from "@/lib/pdf/contract";

export interface ContractForSigning {
  id: string;
  employee_name: string;
  employee_email: string;
  stilling: string | null;
  ansettelsesform: string;
  stillingsprosent: number;
  arbeidssted: string | null;
  start_date: string | null;
  provetid_mnd: number;
  provetid_slutt: string | null;
  lonn_type: string;
  lonn_belop: number | null;
  oppsigelsestid_mnd: number;
  terms: Record<string, string>;
  status: string;
  organisasjon: string | null;
  already_signed: boolean;
  expired: boolean;
}

/** Leser avtalen bak et signeringstoken (uinnlogget, service_role). */
export async function loadContractForSigning(
  token: string,
): Promise<{ contract?: ContractForSigning; error?: string }> {
  const admin = await createAdminClient();
  const { data: c } = await admin
    .from("employment_contracts")
    .select(
      "id, employee_name, employee_email, stilling, ansettelsesform, stillingsprosent, arbeidssted, start_date, provetid_mnd, provetid_slutt, lonn_type, lonn_belop, oppsigelsestid_mnd, terms, status, token_expires_at, organization_id, organizations(firma)",
    )
    .eq("sign_token", token)
    .maybeSingle();

  if (!c) return { error: "Ugyldig eller utløpt signeringslenke." };

  const expired = c.token_expires_at
    ? new Date(c.token_expires_at).getTime() < Date.now()
    : false;

  // organizations(firma) kommer som objekt (én-til-én join).
  const org = c.organizations as { firma: string } | null;

  return {
    contract: {
      id: c.id,
      employee_name: c.employee_name,
      employee_email: c.employee_email,
      stilling: c.stilling,
      ansettelsesform: c.ansettelsesform,
      stillingsprosent: c.stillingsprosent,
      arbeidssted: c.arbeidssted,
      start_date: c.start_date,
      provetid_mnd: c.provetid_mnd,
      provetid_slutt: c.provetid_slutt,
      lonn_type: c.lonn_type,
      lonn_belop: c.lonn_belop,
      oppsigelsestid_mnd: c.oppsigelsestid_mnd,
      terms: (c.terms ?? {}) as Record<string, string>,
      status: c.status,
      organisasjon: org?.firma ?? null,
      already_signed: c.status === "signert",
      expired,
    },
  };
}

/**
 * Ansatt signerer avtalen via token (uten konto). Ved fullført signatur:
 *  - Supabase-bruker opprettes (eller gjenbrukes) i riktig org,
 *  - avtalen låses som 'signert' og profile_id kobles,
 *  - en prøvetids-evalueringsoppgave lages 14 dager før prøvetiden er over,
 *  - PDF genereres og lagres,
 *  - passord-reset-e-post sendes så den ansatte kan sette passord.
 */
export async function signContractAsEmployee(args: {
  token: string;
  signedName: string;
  signatureDataUrl: string;
}): Promise<{ ok?: boolean; error?: string }> {
  const admin = await createAdminClient();

  const { data: c } = await admin
    .from("employment_contracts")
    .select("*")
    .eq("sign_token", args.token)
    .maybeSingle();
  if (!c) return { error: "Ugyldig signeringslenke." };
  if (c.status === "signert") return { error: "Avtalen er allerede signert." };
  if (c.token_expires_at && new Date(c.token_expires_at).getTime() < Date.now()) {
    return { error: "Signeringslenken er utløpt. Be arbeidsgiver sende ny." };
  }
  if (!args.signatureDataUrl?.startsWith("data:image/")) {
    return { error: "Signatur mangler." };
  }
  const signedName = args.signedName.trim();
  if (!signedName) return { error: "Skriv navnet ditt." };

  const email = c.employee_email.trim().toLowerCase();
  const orgId = c.organization_id as string;

  // 1) Finn eksisterende profil i org, ellers opprett ny bruker.
  let profileId: string | null = null;
  const { data: existing } = await admin
    .from("profiles")
    .select("id, organization_id")
    .eq("email", email)
    .maybeSingle();

  if (existing && existing.organization_id === orgId) {
    profileId = existing.id;
  } else if (!existing) {
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password: randomBytes(18).toString("base64url"),
        email_confirm: true,
        user_metadata: {
          full_name: c.employee_name,
          role: "elektriker",
          organization_id: orgId,
        },
      });
    if (createErr || !created.user) {
      return {
        error:
          createErr?.message ?? "Klarte ikke opprette brukerkonto for ansatt.",
      };
    }
    profileId = created.user.id;
    // Defense-in-depth: sørg for korrekt org/navn (som i createUser-actionen).
    await admin
      .from("profiles")
      .update({
        full_name: c.employee_name,
        organization_id: orgId,
        role: "elektriker",
      })
      .eq("id", profileId);
  } else {
    // E-posten finnes i en annen org — kan ikke gjenbrukes her.
    return {
      error:
        "Denne e-postadressen er allerede registrert på en annen bedrift. Bruk en annen e-post.",
    };
  }

  // 2) Lås avtalen som signert (token konsumeres).
  const { error: updErr } = await admin
    .from("employment_contracts")
    .update({
      status: "signert",
      profile_id: profileId,
      employee_signed_at: new Date().toISOString(),
      employee_signed_name: signedName,
      employee_signature_snapshot: args.signatureDataUrl,
      sign_token: null,
    })
    .eq("id", c.id);
  if (updErr) return { error: updErr.message };

  // 3) Prøvetids-evalueringsoppgave: 14 dager før prøvetiden er over.
  if (c.provetid_slutt && c.provetid_mnd > 0) {
    const due = new Date(c.provetid_slutt + "T00:00:00Z");
    due.setUTCDate(due.getUTCDate() - 14);
    const dueDate = due.toISOString().slice(0, 10);
    const reporter = (c.employer_signed_by ?? c.created_by) as string | null;
    if (reporter) {
      await admin.from("tasks").insert({
        title: `Evaluer prøvetid: ${c.employee_name}`,
        description: `Prøvetiden for ${c.employee_name} (${c.stilling ?? "ansatt"}) utløper ${c.provetid_slutt}. Vurder om ansettelsen skal fortsette, og gi tilbakemelding før fristen.`,
        task_type_slug: "provetid_evaluering",
        assigned_to: reporter,
        reported_by: reporter,
        due_date: dueDate,
      });
    }
  }

  // 4) Generer og lagre PDF (ikke-kritisk — signeringen står uansett).
  try {
    const { data: employer } = await admin
      .from("employment_contracts")
      .select("employer_signature_snapshot")
      .eq("id", c.id)
      .single();
    const pdfBytes = await renderContractPdf({
      contract: {
        ...c,
        employee_signed_name: signedName,
        employee_signature_snapshot: args.signatureDataUrl,
        employer_signature_snapshot:
          employer?.employer_signature_snapshot ?? null,
      },
    });
    const path = `kontrakter/${orgId}/${c.id}.pdf`;
    await admin.storage
      .from("documents")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    await admin
      .from("employment_contracts")
      .update({ pdf_path: path })
      .eq("id", c.id);
  } catch {
    // PDF-feil skal ikke velte signeringen.
  }

  // 5) La den ansatte sette passord (Supabase default SMTP).
  try {
    const anon = await createClient();
    const { getAppOrigin } = await import("@/lib/origin");
    const origin = await getAppOrigin();
    await anon.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/profil`,
    });
  } catch {
    // E-postlevering avhenger av SMTP-oppsett; blokkerer ikke signeringen.
  }

  return { ok: true };
}
