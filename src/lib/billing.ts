import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Per-tier lagringskvote (i bytes).
 * trial-tieren er stram for å motvirke misbruk.
 */
export const STORAGE_QUOTA_BYTES = {
  trial: 5 * 1024 ** 3, // 5 GB
  elektro_hms: 50 * 1024 ** 3, // 50 GB
  elektro_hms_iso: 100 * 1024 ** 3, // 100 GB
} as const;

export type Tier = "trial" | "elektro_hms" | "elektro_hms_iso";

export function tierFor(args: {
  plan_tier: string | null;
  has_iso_addon: boolean;
}): Tier {
  if (args.plan_tier === "elektro_hms") {
    return args.has_iso_addon ? "elektro_hms_iso" : "elektro_hms";
  }
  return "trial";
}

export function quotaFor(tier: Tier): number {
  return STORAGE_QUOTA_BYTES[tier];
}

/**
 * Server-side ISO-feature-gate. Skal kalles fra alle ISO-server actions
 * og fra layout-/page-nivå for /iso/* ruter. Kaster hvis org ikke har
 * tilgang så feilen propagerer som ren UI-melding.
 */
export async function requireIsoPlan(
  supabase: SupabaseClient<Database>,
  orgId: string,
): Promise<void> {
  const { data: org } = await supabase
    .from("organizations")
    .select("plan_tier, has_iso_addon, locked_at, subscription_status, trial_ends_at")
    .eq("id", orgId)
    .single();
  if (!org) throw new Error("Fant ikke organisasjon.");
  if (org.locked_at) {
    throw new Error("Abonnementet er låst. Oppdater betaling for å fortsette.");
  }
  // I trial er ALT tilgjengelig (inkludert ISO)
  if (org.subscription_status === "trialing" || org.plan_tier === "trial") {
    return;
  }
  if (!org.has_iso_addon) {
    throw new Error(
      "ISO 9001-modulen krever add-on. Legg den til i /admin/abonnement.",
    );
  }
}

/**
 * Sjekk om en upload med givebbart antall bytes vil overskride kvoten.
 * Bruker den lagrede storage_used_bytes som "good enough" estimat — for
 * absolutt eksakt: kall recalc_org_storage RPC først.
 */
export async function checkStorageQuota(
  supabase: SupabaseClient<Database>,
  orgId: string,
  addBytes: number,
): Promise<{ ok: boolean; used: number; quota: number; remaining: number }> {
  const { data: org } = await supabase
    .from("organizations")
    .select("plan_tier, has_iso_addon, storage_used_bytes")
    .eq("id", orgId)
    .single();
  if (!org) {
    return { ok: false, used: 0, quota: 0, remaining: 0 };
  }
  const tier = tierFor({
    plan_tier: org.plan_tier,
    has_iso_addon: org.has_iso_addon,
  });
  const quota = quotaFor(tier);
  const used = org.storage_used_bytes ?? 0;
  const remaining = Math.max(0, quota - used);
  return { ok: used + addBytes <= quota, used, quota, remaining };
}

/**
 * Brukes i layouts/pages for å sjekke om brukeren skal omdirigeres til
 * read-only/abonnement-skjerm.
 */
export function isOrgLocked(org: {
  locked_at: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  plan_tier: string | null;
}): boolean {
  if (org.locked_at) return true;
  // Trial utløpt og ingen aktiv subscription → lock
  if (
    org.subscription_status !== "active" &&
    org.subscription_status !== "trialing"
  ) {
    if (org.trial_ends_at) {
      return new Date(org.trial_ends_at).getTime() < Date.now();
    }
    return true;
  }
  return false;
}

/**
 * Throw hvis orgen er låst (utløpt trial / forfalt betaling).
 * Skal kalles fra alle write server actions så abonnementsstatus
 * faktisk håndheves på serveren, ikke bare i UI.
 */
export async function guardOrgWritable(
  supabase: SupabaseClient<Database>,
  orgId: string,
): Promise<void> {
  const { data: org } = await supabase
    .from("organizations")
    .select("locked_at, subscription_status, trial_ends_at, plan_tier")
    .eq("id", orgId)
    .single();
  if (!org) throw new Error("Fant ikke organisasjon.");
  if (
    isOrgLocked({
      locked_at: org.locked_at,
      subscription_status: org.subscription_status,
      trial_ends_at: org.trial_ends_at,
      plan_tier: org.plan_tier,
    })
  ) {
    throw new Error(
      "Abonnementet er utløpt eller låst. Gå til /admin/abonnement for å gjenåpne — data slettes ikke.",
    );
  }
}
