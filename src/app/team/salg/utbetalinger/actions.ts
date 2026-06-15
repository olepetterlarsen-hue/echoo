"use server";

import { revalidatePath } from "next/cache";
import { requireEchooStaff, staffAdminClient } from "@/lib/team/staff";

// Marker EN ledger-rad som utbetalt. UNIQUE-en på organization_id i
// commission_ledger sørger for at vi aldri har duplikate rader, så vi
// trenger bare å sjekke at status er pending_payout før vi markerer paid.
export async function markPayout(input: {
  ledger_id: string;
  payout_ref?: string;
  notes?: string;
}): Promise<{ error?: string }> {
  let staff;
  try {
    staff = await requireEchooStaff();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const admin = await staffAdminClient();

  // Hent gjeldende rad for å sjekke status — vi tillater bare
  // pending_payout → paid (ikke double-marking).
  const { data: existing, error: readErr } = await admin
    .from("commission_ledger")
    .select("id, status")
    .eq("id", input.ledger_id)
    .single();
  if (readErr) return { error: readErr.message };
  if (!existing) return { error: "Fant ikke ledger-rad." };
  if (existing.status === "paid") {
    return { error: "Allerede markert som utbetalt." };
  }
  if (existing.status !== "pending_payout") {
    return { error: `Kan ikke utbetale rad med status ${existing.status}.` };
  }

  const { error } = await admin
    .from("commission_ledger")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      paid_by: staff.id,
      payout_ref: input.payout_ref?.trim() || null,
      notes: input.notes?.trim() || null,
    } as never)
    .eq("id", input.ledger_id)
    .eq("status", "pending_payout"); // ekstra sikkerhetsnett mot race

  if (error) return { error: error.message };
  revalidatePath("/team/salg/utbetalinger");
  revalidatePath("/team/salg");
  return {};
}

// Marker ledger-rad som void (kansellert/refundert/feilbokført).
// Brukes f.eks. hvis kunden får refund kort tid etter betaling.
export async function voidLedgerRow(input: {
  ledger_id: string;
  reason: string;
}): Promise<{ error?: string }> {
  let staff;
  try {
    staff = await requireEchooStaff();
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!input.reason.trim()) {
    return { error: "Begrunnelse er påkrevd ved void." };
  }
  const admin = await staffAdminClient();

  const { data: existing } = await admin
    .from("commission_ledger")
    .select("status")
    .eq("id", input.ledger_id)
    .single();
  if (existing?.status === "paid") {
    return {
      error: "Kan ikke void en utbetalt rad — gjør en motpostering i lønn.",
    };
  }

  const { error } = await admin
    .from("commission_ledger")
    .update({
      status: "void",
      notes: input.reason.trim(),
      paid_by: staff.id,
    } as never)
    .eq("id", input.ledger_id);
  if (error) return { error: error.message };
  revalidatePath("/team/salg/utbetalinger");
  revalidatePath("/team/salg");
  return {};
}
