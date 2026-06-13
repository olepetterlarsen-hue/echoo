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

export type AssistantSkill = "avvik" | "sja" | "doc_qa" | "iso" | "template";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

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

export { DEFAULT_MODEL };
