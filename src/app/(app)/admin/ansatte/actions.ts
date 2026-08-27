"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { guardOrgWritable } from "@/lib/billing";
import { getAppOrigin } from "@/lib/origin";
import {
  checkKontrakt,
  suggestKontraktText,
  type KontraktFelter,
  type KontraktIssue,
} from "@/lib/ai/skills/kontrakt";

async function requireAdminOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Ikke innlogget");
  const { data: me } = await supabase
    .from("profiles")
    .select("id, role, organization_id, signature_data_url")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error("Krever admin");
  if (!me.organization_id) throw new Error("Mangler organisasjon");
  return { supabase, user, me, orgId: me.organization_id as string };
}

/** start_date + N måneder -> ISO-dato (YYYY-MM-DD), eller null. */
function addMonths(dateIso: string | undefined, months: number): string | null {
  if (!dateIso) return null;
  const d = new Date(dateIso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export interface ContractInput {
  id?: string;
  employee_name: string;
  employee_email: string;
  stilling?: string;
  ansettelsesform?: "fast" | "midlertidig" | "vikariat" | "laerling";
  stillingsprosent?: number;
  arbeidssted?: string;
  start_date?: string;
  provetid_mnd?: number;
  lonn_type?: "fastlonn" | "timelonn";
  lonn_belop?: number | null;
  oppsigelsestid_mnd?: number;
  terms?: Record<string, string>;
}

export async function saveContractDraft(input: ContractInput): Promise<{
  id?: string;
  error?: string;
}> {
  let ctx;
  try {
    ctx = await requireAdminOrg();
    await guardOrgWritable(ctx.supabase, ctx.orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const email = input.employee_email.trim().toLowerCase();
  const name = input.employee_name.trim();
  if (!email || !name) {
    return { error: "Navn og e-post er påkrevd." };
  }

  const provetid_mnd = input.provetid_mnd ?? 6;
  const row = {
    organization_id: ctx.orgId,
    employee_email: email,
    employee_name: name,
    stilling: input.stilling?.trim() || null,
    ansettelsesform: input.ansettelsesform ?? "fast",
    stillingsprosent: input.stillingsprosent ?? 100,
    arbeidssted: input.arbeidssted?.trim() || null,
    start_date: input.start_date || null,
    provetid_mnd,
    provetid_slutt: addMonths(input.start_date, provetid_mnd),
    lonn_type: input.lonn_type ?? "fastlonn",
    lonn_belop: input.lonn_belop ?? null,
    oppsigelsestid_mnd: input.oppsigelsestid_mnd ?? 1,
    terms: input.terms ?? {},
  };

  // Utkast kan bare redigeres så lenge det ikke er signert.
  if (input.id) {
    const { error } = await ctx.supabase
      .from("employment_contracts")
      .update(row)
      .eq("id", input.id)
      .eq("organization_id", ctx.orgId)
      .in("status", ["utkast", "sendt"]);
    if (error) return { error: error.message };
    revalidatePath("/admin/ansatte");
    return { id: input.id };
  }

  const { data, error } = await ctx.supabase
    .from("employment_contracts")
    .insert({ ...row, status: "utkast", created_by: ctx.user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/admin/ansatte");
  return { id: data.id };
}

export async function aiCheckContract(felter: KontraktFelter): Promise<{
  ok?: boolean;
  issues?: KontraktIssue[];
  error?: string;
}> {
  try {
    await requireAdminOrg();
  } catch (e) {
    return { error: (e as Error).message };
  }
  return checkKontrakt({ felter });
}

export async function aiSuggestClause(args: {
  felter: KontraktFelter;
  klausul: string;
}): Promise<{ text?: string; error?: string }> {
  try {
    await requireAdminOrg();
  } catch (e) {
    return { error: (e as Error).message };
  }
  return suggestKontraktText(args);
}

/**
 * Arbeidsgiver signerer (fra egen profilsignatur) og sender avtalen til
 * ansatt for signering. Returnerer den tokeniserte signeringslenken.
 */
export async function sendContractForSigning(contractId: string): Promise<{
  url?: string;
  error?: string;
}> {
  let ctx;
  try {
    ctx = await requireAdminOrg();
    await guardOrgWritable(ctx.supabase, ctx.orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (!ctx.me.signature_data_url) {
    return {
      error:
        "Du må lagre en signatur i profilen din før du kan sende avtalen. Gå til Profil.",
    };
  }

  const { data: contract } = await ctx.supabase
    .from("employment_contracts")
    .select("id, status, start_date")
    .eq("id", contractId)
    .eq("organization_id", ctx.orgId)
    .single();
  if (!contract) return { error: "Fant ikke avtalen." };
  if (contract.status === "signert") {
    return { error: "Avtalen er allerede signert." };
  }
  if (!contract.start_date) {
    return { error: "Sett tiltredelsesdato før du sender avtalen." };
  }

  const token = randomBytes(24).toString("base64url");
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);

  const { error } = await ctx.supabase
    .from("employment_contracts")
    .update({
      status: "sendt",
      employer_signed_by: ctx.user.id,
      employer_signed_at: new Date().toISOString(),
      employer_signature_snapshot: ctx.me.signature_data_url,
      sign_token: token,
      token_expires_at: expires.toISOString(),
    })
    .eq("id", contractId)
    .eq("organization_id", ctx.orgId);
  if (error) return { error: error.message };

  revalidatePath("/admin/ansatte");
  const origin = await getAppOrigin();
  return { url: `${origin}/signer-kontrakt/${token}` };
}

export async function cancelContract(contractId: string): Promise<{
  error?: string;
}> {
  let ctx;
  try {
    ctx = await requireAdminOrg();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { error } = await ctx.supabase
    .from("employment_contracts")
    .update({ status: "kansellert", sign_token: null })
    .eq("id", contractId)
    .eq("organization_id", ctx.orgId)
    .neq("status", "signert");
  if (error) return { error: error.message };
  revalidatePath("/admin/ansatte");
  return {};
}
