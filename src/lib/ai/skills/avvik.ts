import {
  anthropicClient,
  DEFAULT_MODEL,
  safeParseJson,
} from "@/lib/ai/assistant";
import type { DeviationSeverity, DeviationRootCauseCategory } from "@/lib/types/database";

const SYSTEM_PROMPT = `Du er Echoo sin AI-assistent for elektrobransjen. Du hjelper en elektriker med å skrive et godt avvik (deviation) i Echoo basert på en kort beskrivelse av hva som skjedde.

ALDRI påstå at noe er "godkjent av myndigheter" eller liknende — Echoo er et verktøy, ikke en sertifiseringsmyndighet. Bruk forsiktige formuleringer om forskrifter ("FEL §X krever typisk …", ikke "FEL §X krever at …").

Du svarer ALLTID med et JSON-objekt i dette formatet — ingenting annet, ingen markdown:
{
  "summary": "1-2 setningers oppsummering av hva som skjedde",
  "title": "Kort tittel (maks 80 tegn)",
  "description": "Beskrivelse i 2-4 setninger, objektiv tone",
  "severity": "lav" | "middels" | "hoey" | "kritisk",
  "severity_rationale": "Kort begrunnelse for valg av alvorlighet",
  "root_cause_category": "menneskelig_feil"|"manglende_opplaering"|"utilstrekkelig_prosedyre"|"materiell_svikt"|"feil_verktoey"|"miljoe_forhold"|"kommunikasjon"|"leverandoer"|"design_feil"|"annet",
  "root_cause_description": "Hva er sannsynligvis bakenforliggende årsak? (2-3 setninger)",
  "containment_action": "Hva burde gjøres umiddelbart for å hindre videre skade? (1-3 setninger)",
  "corrective_action": "Hva burde gjøres for å hindre gjentakelse? (1-3 setninger)",
  "clarifying_questions": ["Spørsmål 1", "Spørsmål 2"]
}

Regler for alvorlighet:
- "kritisk": fare for liv/helse, brann, alvorlig personskade — eller stor økonomisk skade
- "hoey": personskade uten alvorlig følgeskade, eller brudd på FSE/FEL med fare
- "middels": prosedyrebrudd uten umiddelbar fare, mindre materiellskade
- "lav": dokumentasjonsavvik, småplukk, observasjon

Regler for clarifying_questions:
- Inkluder 1-3 spørsmål bare hvis informasjonen er åpenbart utilstrekkelig (mangler hvem/hvor/når, eller alvorlighet er uklar).
- Ellers returner tom array.

Skriv alt på norsk (bokmål), saklig og uten dramatisering.`;

export interface AvvikDraft {
  summary: string;
  title: string;
  description: string;
  severity: DeviationSeverity;
  severity_rationale: string;
  root_cause_category: DeviationRootCauseCategory;
  root_cause_description: string;
  containment_action: string;
  corrective_action: string;
  clarifying_questions: string[];
}

export async function generateAvvikDraft(args: {
  description: string;
  previousDraft?: AvvikDraft;
  userFeedback?: string;
}): Promise<{ draft?: AvvikDraft; error?: string }> {
  const client = anthropicClient();
  if (!client) {
    return { error: "AI-assistenten er ikke konfigurert (ANTHROPIC_API_KEY mangler)." };
  }

  const userMessage = args.previousDraft
    ? `Tidligere utkast:\n${JSON.stringify(args.previousDraft, null, 2)}\n\nTilbakemelding fra brukeren:\n${args.userFeedback ?? args.description}\n\nLag oppdatert utkast. Svar bare med JSON.`
    : `Beskrivelse av hendelsen:\n${args.description}\n\nLag avvik-utkast. Svar bare med JSON.`;

  try {
    const msg = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const text = msg.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return { error: "Tomt svar fra AI." };
    }
    const parsed = safeParseJson<AvvikDraft>(text.text);
    if (!parsed) {
      return { error: "Klarte ikke parse AI-svar som JSON." };
    }
    // Sanity-check enum-verdier
    const validSev = ["lav", "middels", "hoey", "kritisk"];
    if (!validSev.includes(parsed.severity)) parsed.severity = "middels";
    return { draft: parsed };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
