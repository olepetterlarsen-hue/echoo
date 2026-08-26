import { anthropicClient, isAssistantAvailable, DEFAULT_MODEL } from "./assistant";
import { captureException } from "@/lib/observability";

const CACHE_MS = 60_000;
let cached: { ok: boolean; checkedAt: number } | null = null;

/**
 * Gjør ett minimalt (max_tokens: 1) Anthropic-kall for å bevise at nøkkelen
 * er gyldig og upstream svarer. Ren funksjon uten cache — testbar isolert.
 */
export async function checkAiHealth(): Promise<boolean> {
  if (!isAssistantAvailable()) return false;
  const client = anthropicClient();
  try {
    await client!.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    return true;
  } catch (err) {
    captureException(err, { scope: "health/ai" });
    return false;
  }
}

/**
 * Samme sjekk, men cachet i minnet i CACHE_MS — kalles fra klienten på hver
 * sidevisning av import-wizarden, og skal ikke trigge ett ekte (betalt)
 * API-kall per bruker per lasting.
 */
export async function checkAiHealthCached(): Promise<boolean> {
  if (cached && Date.now() - cached.checkedAt < CACHE_MS) {
    return cached.ok;
  }
  const ok = await checkAiHealth();
  cached = { ok, checkedAt: Date.now() };
  return ok;
}
