"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import {
  parseImageToImport,
  type ParsedImageFile,
} from "@/lib/ai/skills/image-import";

interface CustomerRow {
  name: string;
  customer_type?: string;
  first_name?: string;
  last_name?: string;
  org_number?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  notes?: string;
}

interface CustomerImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

export async function bulkImportCustomers(input: {
  rows: CustomerRow[];
}): Promise<{ result?: CustomerImportResult; error?: string }> {
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (me?.role !== "admin") {
    return { error: "Kun admin kan kjøre bulk-import." };
  }

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  // Hent eksisterende navn for å hoppe over duplikater
  const { data: existing } = await supabase
    .from("customers")
    .select("name");
  const existingNames = new Set(
    (existing ?? []).map((c: { name: string }) => c.name.toLowerCase()),
  );

  for (let i = 0; i < input.rows.length; i++) {
    const r = input.rows[i];
    const rowNum = i + 2; // +1 for header, +1 for 1-indexed

    // Normaliser customer_type. Aksepter "privat"/"private" → privat,
    // alt annet (inkludert tom verdi) → bedrift.
    const rawType = (r.customer_type ?? "").trim().toLowerCase();
    const customerType: "privat" | "bedrift" =
      rawType === "privat" || rawType === "private" ? "privat" : "bedrift";

    // Avled navn ut fra type — bedrift bruker name, privat avleder fra
    // first_name + last_name hvis name ikke er oppgitt.
    let resolvedName = r.name?.trim() ?? "";
    if (customerType === "privat" && !resolvedName) {
      resolvedName = [r.first_name?.trim(), r.last_name?.trim()]
        .filter(Boolean)
        .join(" ");
    }

    if (!resolvedName) {
      errors.push(
        `Rad ${rowNum}: mangler navn${customerType === "privat" ? " (eller fornavn+etternavn)" : ""}`,
      );
      continue;
    }
    if (existingNames.has(resolvedName.toLowerCase())) {
      skipped++;
      continue;
    }
    const { error } = await supabase.from("customers").insert({
      organization_id: orgId,
      customer_type: customerType,
      name: resolvedName,
      first_name:
        customerType === "privat" ? r.first_name?.trim() || null : null,
      last_name:
        customerType === "privat" ? r.last_name?.trim() || null : null,
      org_number:
        customerType === "bedrift" ? r.org_number?.trim() || null : null,
      contact_person: r.contact_person?.trim() || null,
      email: r.email?.trim() || null,
      phone: r.phone?.trim() || null,
      address: r.address?.trim() || null,
      postal_code: r.postal_code?.trim() || null,
      city: r.city?.trim() || null,
      notes: r.notes?.trim() || null,
      created_by: userId,
    } as never);
    if (error) {
      errors.push(`Rad ${rowNum} (${resolvedName}): ${error.message}`);
      continue;
    }
    existingNames.add(resolvedName.toLowerCase());
    created++;
  }

  revalidatePath("/kunder");
  return { result: { created, skipped, errors } };
}

interface ProjectRow {
  project_number: string;
  title: string;
  customer_name?: string;
  customer_org_number?: string;
  customer_contact?: string;
  customer_email?: string;
  customer_phone?: string;
  site_address?: string;
  site_postal_code?: string;
  site_city?: string;
  status?: string;
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  notes?: string;
}

interface ProjectImportResult {
  created: number;
  skipped: number;
  customers_linked: number;
  errors: string[];
}

export async function bulkImportProjects(input: {
  rows: ProjectRow[];
}): Promise<{ result?: ProjectImportResult; error?: string }> {
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (me?.role !== "admin") {
    return { error: "Kun admin kan kjøre bulk-import." };
  }

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;
  let customers_linked = 0;

  // Eksisterende prosjektnumre
  const { data: existingProjects } = await supabase
    .from("projects")
    .select("project_number");
  const existingNumbers = new Set(
    (existingProjects ?? []).map((p: { project_number: string }) =>
      p.project_number.trim().toLowerCase(),
    ),
  );

  // Eksisterende kunder for matching
  const { data: existingCustomers } = await supabase
    .from("customers")
    .select("id, name");
  const customerByName = new Map<string, string>();
  for (const c of existingCustomers ?? []) {
    customerByName.set(
      (c as { name: string }).name.trim().toLowerCase(),
      (c as { id: string }).id,
    );
  }

  const VALID_STATUS = ["aktiv", "paa_vent", "ferdigstilt", "arkivert"];

  for (let i = 0; i < input.rows.length; i++) {
    const r = input.rows[i];
    const rowNum = i + 2;
    if (!r.project_number?.trim() || !r.title?.trim()) {
      errors.push(`Rad ${rowNum}: mangler prosjektnummer eller tittel`);
      continue;
    }
    if (existingNumbers.has(r.project_number.trim().toLowerCase())) {
      skipped++;
      continue;
    }

    // Match kunde hvis oppgitt
    let customer_id: string | null = null;
    if (r.customer_name?.trim()) {
      customer_id =
        customerByName.get(r.customer_name.trim().toLowerCase()) ?? null;
      if (customer_id) customers_linked++;
    }

    const status = r.status && VALID_STATUS.includes(r.status) ? r.status : "aktiv";

    const { error } = await supabase.from("projects").insert({
      organization_id: orgId,
      project_number: r.project_number.trim(),
      title: r.title.trim(),
      customer_id,
      customer_name: r.customer_name?.trim() || null,
      customer_org_number: r.customer_org_number?.trim() || null,
      customer_contact: r.customer_contact?.trim() || null,
      customer_email: r.customer_email?.trim() || null,
      customer_phone: r.customer_phone?.trim() || null,
      site_address: r.site_address?.trim() || null,
      site_postal_code: r.site_postal_code?.trim() || null,
      site_city: r.site_city?.trim() || null,
      status,
      scheduled_start_date: r.scheduled_start_date?.trim() || null,
      scheduled_end_date: r.scheduled_end_date?.trim() || null,
      notes: r.notes?.trim() || null,
      created_by: userId,
    } as never);
    if (error) {
      errors.push(`Rad ${rowNum} (${r.project_number}): ${error.message}`);
      continue;
    }
    existingNumbers.add(r.project_number.trim().toLowerCase());
    created++;
  }

  revalidatePath("/prosjekter");
  return { result: { created, skipped, customers_linked, errors } };
}

interface UserRow {
  email: string;
  full_name?: string;
  role?: string;
  phone?: string;
}

interface UserInviteResult {
  invited: number;
  already_member: number;
  errors: string[];
}

const VALID_ROLES = [
  "admin",
  "installator",
  "bemyndiget",
  "prosjektleder",
  "elektriker",
  "montor",
];

export async function bulkInviteUsers(input: {
  rows: UserRow[];
}): Promise<{ result?: UserInviteResult; error?: string }> {
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (me?.role !== "admin") {
    return { error: "Kun admin kan invitere brukere." };
  }

  // Service-role for å invitere via auth admin API
  const admin = await createAdminClient();

  const errors: string[] = [];
  let invited = 0;
  let already_member = 0;

  for (let i = 0; i < input.rows.length; i++) {
    const r = input.rows[i];
    const rowNum = i + 2;
    const email = r.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      errors.push(`Rad ${rowNum}: ugyldig e-post`);
      continue;
    }
    const role =
      r.role && VALID_ROLES.includes(r.role.trim().toLowerCase())
        ? r.role.trim().toLowerCase()
        : "elektriker";

    // Sjekk om brukeren allerede er medlem i org-en
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, organization_id")
      .eq("email", email)
      .maybeSingle();
    if (
      existingProfile &&
      (existingProfile as { organization_id: string | null }).organization_id ===
        orgId
    ) {
      already_member++;
      continue;
    }

    try {
      // inviteUserByEmail oppretter auth.user + sender mail
      const { data: invite, error: inviteErr } =
        await admin.auth.admin.inviteUserByEmail(email, {
          data: {
            full_name: r.full_name?.trim() || null,
            phone: r.phone?.trim() || null,
            organization_id: orgId,
            role,
          },
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.echoo.no"}/login`,
        });
      if (inviteErr) {
        // Hvis bruker eksisterer i auth: oppdater profilen til vår org
        if (
          inviteErr.message?.toLowerCase().includes("already") ||
          inviteErr.message?.toLowerCase().includes("registered")
        ) {
          // Forsøk å hente bruker via listUsers
          const { data: list } = await admin.auth.admin.listUsers();
          const existing = list?.users.find(
            (u) => u.email?.toLowerCase() === email,
          );
          if (existing) {
            // Lag/oppdater profile-rad
            await admin
              .from("profiles")
              .upsert(
                {
                  id: existing.id,
                  email,
                  full_name: r.full_name?.trim() || null,
                  phone: r.phone?.trim() || null,
                  organization_id: orgId,
                  role,
                  active: true,
                } as never,
                { onConflict: "id" },
              );
            invited++;
            continue;
          }
        }
        errors.push(`Rad ${rowNum} (${email}): ${inviteErr.message}`);
        continue;
      }

      // Opprett/oppdater profile-rad
      if (invite?.user) {
        await admin
          .from("profiles")
          .upsert(
            {
              id: invite.user.id,
              email,
              full_name: r.full_name?.trim() || null,
              phone: r.phone?.trim() || null,
              organization_id: orgId,
              role,
              active: true,
            } as never,
            { onConflict: "id" },
          );
      }
      invited++;
    } catch (e) {
      errors.push(`Rad ${rowNum} (${email}): ${(e as Error).message}`);
    }
  }

  revalidatePath("/admin/brukere");
  return { result: { invited, already_member, errors } };
}

/**
 * Parser et skjermbilde (PNG/JPG) av en kunde-/prosjekt-/brukerliste fra
 * et annet system via Claude Vision. Returnerer samme format som
 * xlsx-parseren så UI-en kan bruke samme preview-flyt.
 *
 * 5 MB grense på selve bildet for å unngå urimelig token-bruk og latency.
 */
export async function parseImportImage(input: {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}): Promise<{ result?: ParsedImageFile; error?: string }> {
  const supabase = await createClient();
  let userId: string;
  try {
    ({ userId } = await getOrgAndUser(supabase));
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (me?.role !== "admin") {
    return { error: "Kun admin kan bruke AI-skjermbilde-import." };
  }

  // Grovsjekk: base64-størrelse * 0.75 ≈ binær-størrelse
  const approxBytes = Math.floor(input.base64.length * 0.75);
  if (approxBytes > 5 * 1024 * 1024) {
    return {
      error:
        "Bildet er for stort (over 5 MB). Komprimer eller crop ned før opplasting.",
    };
  }

  return parseImageToImport(input);
}
