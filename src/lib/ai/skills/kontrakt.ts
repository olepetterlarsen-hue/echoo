import {
  guardedMessage,
  DEFAULT_MODEL,
  safeParseJson,
  anthropicClient,
} from "@/lib/ai/assistant";

/**
 * AI-hjelp for arbeidsavtaler (HR-onboarding):
 *  - suggestKontraktText: foreslår norsk klausultekst ut fra strukturerte felt.
 *  - checkKontrakt: leser hele avtalen og flagger selvmotsigelser + mangler,
 *    så admin ikke sender en inkonsistent avtale.
 *
 * Følger Echoos AI-regler: forsiktige formuleringer, aldri påstå at noe er
 * "juridisk godkjent" — dette er utkast admin selv står ansvarlig for.
 */

export interface KontraktFelter {
  employee_name?: string;
  stilling?: string;
  ansettelsesform?: "fast" | "midlertidig" | "vikariat" | "laerling";
  stillingsprosent?: number;
  arbeidssted?: string;
  start_date?: string;
  provetid_mnd?: number;
  lonn_type?: "fastlonn" | "timelonn";
  lonn_belop?: number;
  oppsigelsestid_mnd?: number;
  terms?: Record<string, string>;
}

const NOT_CONFIGURED =
  "AI-assistenten er ikke konfigurert (ANTHROPIC_API_KEY mangler).";

const BASE_RULES = `Du er Echoo sin AI-assistent for norske elektrobedrifter og hjelper en arbeidsgiver med å skrive en arbeidsavtale (arbeidskontrakt) etter norsk arbeidsmiljølov.

Viktige regler:
- Skriv på norsk (bokmål), saklig og presist.
- ALDRI påstå at avtalen er "juridisk godkjent" eller "i tråd med loven" som en garanti — arbeidsgiver er selv ansvarlig. Bruk forsiktige formuleringer ("bør typisk inneholde …").
- Prøvetid kan etter aml. § 15-6 maks være 6 måneder.
- Ikke finn på tall (lønn, prosent, datoer) som ikke er oppgitt.`;

const SUGGEST_SYSTEM = `${BASE_RULES}

Du får strukturerte felter for avtalen og hvilken klausul brukeren vil ha tekst til. Skriv EN kort, tydelig klausultekst (1-4 setninger) som passer feltene. Svar ALLTID med JSON, ingenting annet, ingen markdown:
{ "text": "klausulteksten" }`;

const CHECK_SYSTEM = `${BASE_RULES}

Du får alle feltene og fritekst-klausulene i en arbeidsavtale. Din jobb er å finne SELVMOTSIGELSER og MANGLER — f.eks.:
- fritekst nevner en lønn/stillingsprosent/dato som ikke stemmer med de strukturerte feltene,
- prøvetid nevnt i tekst avviker fra prøvetid-feltet,
- midlertidig ansettelse uten oppgitt grunn/sluttdato,
- manglende obligatoriske opplysninger (stilling, tiltredelse, lønn, arbeidssted, oppsigelsestid).

Svar ALLTID med JSON, ingenting annet, ingen markdown:
{
  "ok": true | false,
  "issues": [
    { "felt": "hvilket felt/klausul", "alvorlighet": "feil" | "advarsel" | "tips", "melding": "hva som er galt", "forslag": "kort forslag til retting (valgfritt)" }
  ]
}
"ok" er true bare hvis ingen "feil" finnes. Returner tom issues-array hvis alt er konsistent.`;

export interface KontraktIssue {
  felt: string;
  alvorlighet: "feil" | "advarsel" | "tips";
  melding: string;
  forslag?: string;
}

export async function suggestKontraktText(args: {
  felter: KontraktFelter;
  klausul: string;
}): Promise<{ text?: string; error?: string }> {
  if (!anthropicClient()) return { error: NOT_CONFIGURED };
  const userMessage = `Felter:\n${JSON.stringify(args.felter, null, 2)}\n\nSkriv klausultekst for: ${args.klausul}\n\nSvar bare med JSON.`;
  try {
    const msg = await guardedMessage({
      model: DEFAULT_MODEL,
      max_tokens: 700,
      system: SUGGEST_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    });
    const block = msg.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return { error: "Tomt svar fra AI." };
    const parsed = safeParseJson<{ text: string }>(block.text);
    if (!parsed?.text) return { error: "Klarte ikke parse AI-svar." };
    return { text: parsed.text };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function checkKontrakt(args: {
  felter: KontraktFelter;
}): Promise<{ ok?: boolean; issues?: KontraktIssue[]; error?: string }> {
  if (!anthropicClient()) return { error: NOT_CONFIGURED };
  const userMessage = `Arbeidsavtale (felter + fritekst):\n${JSON.stringify(args.felter, null, 2)}\n\nFinn selvmotsigelser og mangler. Svar bare med JSON.`;
  try {
    const msg = await guardedMessage({
      model: DEFAULT_MODEL,
      max_tokens: 1200,
      system: CHECK_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    });
    const block = msg.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return { error: "Tomt svar fra AI." };
    const parsed = safeParseJson<{ ok: boolean; issues: KontraktIssue[] }>(
      block.text,
    );
    if (!parsed) return { error: "Klarte ikke parse AI-svar." };
    const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
    // "ok" er bare sant hvis ingen harde feil.
    const ok = !issues.some((i) => i.alvorlighet === "feil");
    return { ok, issues };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
