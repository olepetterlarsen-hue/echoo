"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import { generateAvvikDraft, type AvvikDraft } from "@/lib/ai/skills/avvik";

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
