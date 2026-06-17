"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import { generateAvvikDraft, type AvvikDraft } from "@/lib/ai/skills/avvik";
import { generateSjaDraft, type SjaDraft } from "@/lib/ai/skills/sja";
import { isoVeilederTurn, type IsoMessage } from "@/lib/ai/skills/iso";
import {
  onboardingTurn,
  ONBOARDING_STEPS,
  type OnboardingMessage,
  type OnboardingProgress,
  type OnboardingStepId,
} from "@/lib/ai/skills/onboarding";

/**
 * AI-assistent server actions.
 *
 * Alle kaller verifiserer auth + org via getOrgAndUser. Aldri service-role.
 * Read-actions er trygge selv om org er låst — guard ikke på guardOrgWritable.
 */

export async function askAvvikAssistant(args: {
  description: string;
  previousDraft?: AvvikDraft;
  userFeedback?: string;
}): Promise<{ draft?: AvvikDraft; error?: string }> {
  const supabase = await createClient();
  try {
    await getOrgAndUser(supabase);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!args.description.trim() && !args.previousDraft) {
    return { error: "Beskriv hva som skjedde først." };
  }
  return generateAvvikDraft(args);
}

export async function askSjaAssistant(args: {
  description: string;
  previousDraft?: SjaDraft;
  userFeedback?: string;
}): Promise<{ draft?: SjaDraft; error?: string }> {
  const supabase = await createClient();
  try {
    await getOrgAndUser(supabase);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!args.description.trim() && !args.previousDraft) {
    return { error: "Beskriv jobben først." };
  }
  return generateSjaDraft(args);
}

export async function askIsoVeileder(args: {
  messages: IsoMessage[];
}): Promise<{ reply?: string; error?: string }> {
  const supabase = await createClient();
  try {
    await getOrgAndUser(supabase);
  } catch (e) {
    return { error: (e as Error).message };
  }
  return isoVeilederTurn(args);
}

/**
 * Onboarding-skill — leser brukerens nåværende progress + auto-detekterer
 * hvilke steg er fullført basert på ekte app-data, sender til AI, lagrer
 * tilbake. Returnerer reply + oppdatert progress.
 */
export async function askOnboarding(args: {
  messages: OnboardingMessage[];
}): Promise<{
  reply?: string;
  progress?: OnboardingProgress;
  error?: string;
}> {
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Hent eksisterende state (eller lag tom hvis ingen)
  // onboarding_state er ny i migration 063 — Database-typen er ikke regenerert
  // ennå. Bruker un-typed supabase-handle via any-cast. RLS gjelder uansett.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: existing } = await sb
    .from("onboarding_state")
    .select("completed_steps, current_step, notes, finished_at, messages_count")
    .eq("user_id", userId)
    .maybeSingle();

  const existingState = (existing ?? {
    completed_steps: [],
    current_step: null,
    notes: null,
    finished_at: null,
    messages_count: 0,
  }) as {
    completed_steps: OnboardingStepId[];
    current_step: OnboardingStepId | null;
    notes: string | null;
    finished_at: string | null;
    messages_count: number;
  };

  // Auto-detekter hvilke steg som er fullført basert på faktisk app-data.
  // Sjekker minst-én-eksisterer per steg.
  const [
    { count: nCustomers },
    { count: nProjects },
    { count: nMembers },
    { count: nCerts },
    { count: nRoutines },
    { count: nDrafts },
  ] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .neq("id", userId),
    supabase.from("certificates").select("id", { count: "exact", head: true }),
    supabase
      .from("routines")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "utkast"),
  ]);

  const detectedCompleted: OnboardingStepId[] = [];
  if ((nCustomers ?? 0) > 0) detectedCompleted.push("kunde");
  if ((nProjects ?? 0) > 0) detectedCompleted.push("prosjekt");
  if ((nMembers ?? 0) > 0) detectedCompleted.push("team");
  if ((nCerts ?? 0) > 0) detectedCompleted.push("kompetanse");
  if ((nRoutines ?? 0) > 0) detectedCompleted.push("rutine");
  if ((nDrafts ?? 0) > 0) detectedCompleted.push("dokument");

  // Union av tidligere + ny-detekterte
  const completed = Array.from(
    new Set([...existingState.completed_steps, ...detectedCompleted]),
  ) as OnboardingStepId[];

  const progress: OnboardingProgress = {
    completed_steps: completed,
    current_step: existingState.current_step ?? undefined,
    notes: existingState.notes ?? undefined,
    finished: !!existingState.finished_at,
  };

  const result = await onboardingTurn({
    messages: args.messages,
    progress,
  });

  if (result.error || !result.reply) {
    return { error: result.error ?? "Ukjent feil" };
  }

  // Persister state
  await sb.from("onboarding_state").upsert(
    {
      user_id: userId,
      completed_steps: completed,
      last_helped_at: new Date().toISOString(),
      messages_count: existingState.messages_count + 1,
    },
    { onConflict: "user_id" },
  );

  return { reply: result.reply, progress };
}

export async function markOnboardingFinished(): Promise<{
  ok?: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  let userId: string;
  try {
    ({ userId } = await getOrgAndUser(supabase));
  } catch (e) {
    return { error: (e as Error).message };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { error } = await sb.from("onboarding_state").upsert(
    {
      user_id: userId,
      finished_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };
  return { ok: true };
}
// MERK: Ingen non-async-eksport her (ONBOARDING_STEPS, types osv.).
// "use server"-filer i Next 16 kan KUN eksportere async functions.
// Import ONBOARDING_STEPS direkte fra @/lib/ai/skills/onboarding hvis du
// trenger det i andre filer.
