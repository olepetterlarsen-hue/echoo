/**
 * Echoo AI-assistent — shared server-side helpers.
 *
 * Sikkerhetsregler:
 * 1. ALDRI bruk service_role for å hente kontekst — bruk brukerens egen
 *    SSR-klient (createClient) så RLS gjelder.
 * 2. Aldri lagre signerbare dokumenter direkte — assistenten skriver
 *    utkast som brukeren godkjenner.
 * 3. Logg AI-genererte felt med ai_generated=true for sporbarhet.
 * 4. Forsiktige formuleringer om forskrifter — ingen "godkjent av
 *    myndigheter"-påstander.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { captureException } from "@/lib/observability";

/**
 * Feilmelding vist til sluttbruker når AI-tjenesten svikter. Aldri
 * leverandørnavn, statuskoder eller rått upstream-JSON i UI — se
 * guardedMessage() som er eneste sted client.messages.create() kalles fra.
 */
export const AI_UNAVAILABLE_MESSAGE =
  "AI-tjenesten er utilgjengelig akkurat nå. Prøv igjen om litt, eller registrer dokumentet manuelt.";

/**
 * Logger full upstream-feil server-side (med request-id om tilgjengelig) og
 * returnerer en fast, norsk feil uten leverandørnavn/statuskode/JSON — det
 * er ALDRI trygt å videreformidle `err.message` fra Anthropic-SDK-et til UI,
 * f.eks. `401 {"type":"error","error":{"type":"authentication_error",...}}`.
 */
export function toSafeAiError(err: unknown, scope: string): Error {
  const requestID =
    err instanceof Anthropic.APIError ? err.requestID : undefined;
  captureException(err, { scope, requestID });
  return new Error(AI_UNAVAILABLE_MESSAGE);
}

export type AssistantSkill = "avvik" | "sja" | "doc_qa" | "iso" | "template";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

/**
 * Månedlig AI-kostnadstak per bruker (USD). Håndheves før hvert AI-kall via
 * guardedMessage(). Hindrer at én innlogget bruker kjører opp regningen.
 * Det harde taket er fortsatt spend-grensen i Anthropic Console.
 */
export const AI_MONTHLY_BUDGET_USD = 70;

// Claude Haiku 4.5-priser (USD per million tokens). Justér ved modellbytte.
const PRICE_INPUT_PER_MTOK = 1.0;
const PRICE_OUTPUT_PER_MTOK = 5.0;

function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * PRICE_INPUT_PER_MTOK +
    (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_MTOK
  );
}

let _client: Anthropic | null = null;

export function anthropicClient(): Anthropic | null {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-anthropic-key") return null;
  _client = new Anthropic({ apiKey });
  return _client;
}

export function isAssistantAvailable(): boolean {
  const k = process.env.ANTHROPIC_API_KEY;
  return !!k && k !== "your-anthropic-key";
}

/**
 * Standard JSON-parse utility for AI-svar. Claude vil av og til
 * pakke svaret i markdown fences — vi stripper dem først.
 */
export function safeParseJson<T>(raw: string): T | null {
  try {
    let s = raw.trim();
    if (s.startsWith("```")) {
      s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    }
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

/**
 * Kjør et Anthropic-kall MED budsjett-håndhevelse.
 *
 * Alle AI-kall i Echoo skal gå gjennom denne (ikke client.messages.create
 * direkte), slik at hver bruker har et månedlig kostnadstak:
 *  1. Henter innlogget bruker via SSR-klienten (cookies) — ingen service-role.
 *  2. Avviser hvis brukeren har passert AI_MONTHLY_BUDGET_USD denne måneden.
 *  3. Kjører kallet og logger faktisk token-forbruk + estimert kostnad.
 *
 * Kaster Error ved manglende nøkkel eller oppbrukt budsjett — kallstedene
 * fanger dette og returnerer feilmeldingen til UI.
 */
export async function guardedMessage(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  const client = anthropicClient();
  if (!client) {
    throw new Error(
      "AI-assistenten er ikke konfigurert (ANTHROPIC_API_KEY mangler).",
    );
  }

  const supabase = await createClient();
  // RPC-navn finnes ikke i den genererte Database-typen ennå.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpc = supabase.rpc.bind(supabase) as any;

  const { data: usedRaw } = await rpc("ai_usage_this_month");
  const spent = Number(usedRaw ?? 0);
  if (Number.isFinite(spent) && spent >= AI_MONTHLY_BUDGET_USD) {
    throw new Error(
      `AI-budsjettet for denne måneden er brukt opp (grense $${AI_MONTHLY_BUDGET_USD}). ` +
        "Det nullstilles ved månedsskiftet — kontakt support hvis du trenger mer.",
    );
  }

  let msg: Anthropic.Message;
  try {
    msg = await client.messages.create(params);
  } catch (err) {
    throw toSafeAiError(err, "guardedMessage");
  }

  const inputTokens = msg.usage?.input_tokens ?? 0;
  const outputTokens = msg.usage?.output_tokens ?? 0;
  try {
    await rpc("record_ai_usage", {
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens,
      p_cost: estimateCostUsd(inputTokens, outputTokens),
    });
  } catch {
    // Logging skal aldri velte selve AI-svaret.
  }

  return msg;
}

export { DEFAULT_MODEL };
