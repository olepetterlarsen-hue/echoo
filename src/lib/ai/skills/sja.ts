import {
  anthropicClient,
  DEFAULT_MODEL,
  safeParseJson,
} from "@/lib/ai/assistant";

const SYSTEM_PROMPT = `Du er Echoo sin AI-assistent for HMS i norsk elektrobransje. Du hjelper en elektriker med å skrive en SJA (sikker jobb-analyse) før en jobb starter.

VIKTIG:
- Du er IKKE en sertifiseringsmyndighet. Bruk forsiktige formuleringer ("FSE krever typisk …", ikke "FSE krever at …"). Aldri påstå at noe er "godkjent" av myndigheter.
- Brukeren som signerer SJA-en står alltid ansvarlig — du skriver utkast, ikke fasit.
- Norske bransjeforkortelser: FSE = forskrift om sikkerhet ved arbeid i og drift av elektriske anlegg, FEL = forskrift om elektriske lavspenningsanlegg, NEK 400 = standard for lavspenningsanlegg.

Du svarer ALLTID med rent JSON-objekt — ingen markdown, ingen forklaring rundt:
{
  "summary": "1-2 setningers oppsummering av jobben",
  "job_description": "Hva som skal gjøres (2-4 setninger)",
  "location_type": "tavle"|"bygg"|"utendoers"|"tunnel"|"hoeyder"|"annet",
  "energy_state": "spenningsloest"|"energiert"|"delvis"|"ukjent",
  "hazards": [
    {
      "name": "Kort tittel på faren",
      "category": "elektrisk"|"fall"|"kjemikalie"|"mekanisk"|"klima"|"trafikk"|"annet",
      "risk_score": 1-25,
      "rationale": "Hvorfor denne risikoscoren? (1 setning)",
      "controls": "Konkrete tiltak for å redusere risiko (1-3 setninger)",
      "ppe": ["briller", "hansker", "hjelm", ...]
    }
  ],
  "general_ppe": ["..."],
  "fse_notes": "Forsiktig formulert tekst om FSE/FEL/NEK 400-momenter som er relevante her",
  "competence_required": "Hvilken kompetanse trengs (f.eks. \\"FSE-kurs, bemyndiget montør\\")",
  "clarifying_questions": ["Spørsmål 1", "Spørsmål 2"]
}

REGLER:
- risk_score = sannsynlighet (1-5) × konsekvens (1-5). Ikke skriv ut formelen.
- For "energiert" + elektrisk arbeid: vurder alltid om jobben kan utføres spenningsløst først (FSE §10).
- Inkluder typiske farer for jobbtypen — ikke bare det brukeren nevner. Eks: arbeid i tavle → også vurder lysbue-fare, fall, kjemikalier i kontakter.
- 3-7 hazards er typisk. Færre hvis veldig enkel jobb, flere hvis kompleks.
- general_ppe = baseline (vernebriller, vernesko, hansker) som gjelder hele jobben.
- competence_required: konkret, ikke generisk. F.eks. "Bemyndiget montør med gyldig FSE-kurs siste 12 mnd".
- clarifying_questions: 1-3 spørsmål kun hvis kritisk info mangler (energistatus, spenningsnivå, om jobben kan kobles fra). Ellers tom array.

Skriv alt på norsk (bokmål), saklig og presist — uten dramatisering.`;

export interface SjaDraft {
  summary: string;
  job_description: string;
  location_type:
    | "tavle"
    | "bygg"
    | "utendoers"
    | "tunnel"
    | "hoeyder"
    | "annet";
  energy_state: "spenningsloest" | "energiert" | "delvis" | "ukjent";
  hazards: Array<{
    name: string;
    category:
      | "elektrisk"
      | "fall"
      | "kjemikalie"
      | "mekanisk"
      | "klima"
      | "trafikk"
      | "annet";
    risk_score: number;
    rationale: string;
    controls: string;
    ppe: string[];
  }>;
  general_ppe: string[];
  fse_notes: string;
  competence_required: string;
  clarifying_questions: string[];
}

export async function generateSjaDraft(args: {
  description: string;
  previousDraft?: SjaDraft;
  userFeedback?: string;
}): Promise<{ draft?: SjaDraft; error?: string }> {
  const client = anthropicClient();
  if (!client) {
    return { error: "AI-assistenten er ikke konfigurert (ANTHROPIC_API_KEY mangler)." };
  }

  const userMessage = args.previousDraft
    ? `Tidligere utkast:\n${JSON.stringify(args.previousDraft, null, 2)}\n\nTilbakemelding/justering fra brukeren:\n${args.userFeedback ?? args.description}\n\nLag oppdatert utkast. Svar bare med JSON.`
    : `Jobben skal:\n${args.description}\n\nLag SJA-utkast. Svar bare med JSON.`;

  try {
    const msg = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const text = msg.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return { error: "Tomt svar fra AI." };
    }
    const parsed = safeParseJson<SjaDraft>(text.text);
    if (!parsed) {
      return { error: "Klarte ikke parse AI-svar som JSON." };
    }
    // Sanity defaults
    if (!Array.isArray(parsed.hazards)) parsed.hazards = [];
    if (!Array.isArray(parsed.general_ppe)) parsed.general_ppe = [];
    if (!Array.isArray(parsed.clarifying_questions))
      parsed.clarifying_questions = [];
    return { draft: parsed };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
