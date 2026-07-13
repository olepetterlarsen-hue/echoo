/**
 * Image-import-skill: tar et skjermbilde av en kundeliste, prosjektliste
 * eller brukerliste fra et annet system (Excel, Visma, Tripletex,
 * fakturasystem osv.), og bruker Claude Vision til å trekke ut strukturert
 * data som matcher Echoo sin bulk-import-mal.
 *
 * Returnerer samme format som xlsx-parseren — Kunder/Prosjekter/Brukere
 * med rader som har de samme feltnavnene. Da kan UI-en re-bruke samme
 * preview/import-flyt for begge inputs.
 */

import { anthropicClient, guardedMessage } from "@/lib/ai/assistant";

// Bruker en sterkere Claude-modell her — Haiku har redusert kvalitet på
// strukturert ekstraksjon fra bilder. Sonnet er en bra middelvei.
const VISION_MODEL = "claude-sonnet-4-6";

export interface ParsedImageRow {
  values: Record<string, string>;
  rowNum: number;
}

export interface ParsedImageSheet {
  rows: ParsedImageRow[];
  expectedHeaders: string[];
  headerWarning?: string;
}

export interface ParsedImageFile {
  kunder?: ParsedImageSheet;
  prosjekter?: ParsedImageSheet;
  brukere?: ParsedImageSheet;
  note?: string;
}

const CUSTOMER_FIELDS = [
  "customer_type",
  "name",
  "first_name",
  "last_name",
  "org_number",
  "contact_person",
  "email",
  "phone",
  "address",
  "postal_code",
  "city",
  "notes",
];

const PROJECT_FIELDS = [
  "project_number",
  "title",
  "customer_name",
  "customer_org_number",
  "customer_contact",
  "customer_email",
  "customer_phone",
  "site_address",
  "site_postal_code",
  "site_city",
  "status",
  "scheduled_start_date",
  "scheduled_end_date",
  "notes",
];

const USER_FIELDS = ["email", "first_name", "last_name", "role", "phone"];

const SYSTEM_PROMPT = `Du er Echoo sin import-assistent. Du får et skjermbilde
av en liste fra et annet system (regneark, Visma, Tripletex, fakturasystem,
e-post-kontaktliste osv.) og skal trekke ut strukturert data.

Vurder først hva slags entitet bildet hovedsakelig inneholder:
- "kunder" — bedrifter eller privatpersoner som er kunder
- "prosjekter" — arbeidsordrer, oppdrag, byggesaker
- "brukere" — ansatte, medarbeidere, team

Et bilde kan inneholde flere typer (f.eks. kundeliste med tilknyttede prosjekter).
Returner én array per type du finner. Tom array hvis ingen.

OUTPUT må være JSON med eksakt denne strukturen:
{
  "kunder": [{ "customer_type": "bedrift|privat", "name": ..., "first_name": ..., "last_name": ..., "org_number": ..., "contact_person": ..., "email": ..., "phone": ..., "address": ..., "postal_code": ..., "city": ..., "notes": ... }, ...],
  "prosjekter": [{ "project_number": ..., "title": ..., "customer_name": ..., ... }, ...],
  "brukere": [{ "email": ..., "first_name": ..., "last_name": ..., "role": ..., "phone": ... }, ...],
  "note": "kort kommentar om hva du så og evt usikkerheter (norsk)"
}

KUNDER:
- customer_type: "bedrift" hvis det er et firmanavn (AS, ASA, ANS, DA, etc) eller
  orgnr finnes. "privat" hvis det er en personlig kunde med for-/etternavn.
- Bedrift: name = firmanavn. first_name/last_name skal være null.
- Privat: first_name + last_name. name kan bygges av disse, men la den være
  null hvis du ikke er sikker.

PROSJEKTER:
- project_number: la stå null hvis ikke synlig — Echoo gir auto-nummer ved
  import.
- status: hvis ikke spesifisert, sett "aktiv".
- scheduled_start_date / scheduled_end_date: kun hvis tydelig synlig i bildet.
  Format YYYY-MM-DD.

BRUKERE:
- role: "elektriker" som default hvis ikke spesifisert. Andre gyldige:
  admin, installator, bemyndiget, prosjektleder, montor.

REGLER:
- Felt du ikke ser i bildet skal være null (ikke gjette).
- Telefon: normaliser til "+47 XXX XX XXX" hvis tydelig norsk, ellers behold
  som angitt.
- E-post må inneholde @ — hvis ikke, sett null.
- Postnr: behold som streng (kan ha foranstilt 0).
- Returner KUN JSON. Ingen forklaring foran/etter. Ingen markdown-fences.`;

function safeParseJson<T>(raw: string): T | null {
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

export async function parseImageToImport(args: {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}): Promise<{ result?: ParsedImageFile; error?: string }> {
  const client = anthropicClient();
  if (!client) {
    return {
      error: "AI-import er ikke konfigurert (ANTHROPIC_API_KEY mangler).",
    };
  }

  try {
    const msg = await guardedMessage({
      model: VISION_MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: args.mediaType,
                data: args.base64,
              },
            },
            {
              type: "text",
              text: "Trekk ut all data fra bildet som JSON-strukturen vi avtalte. Hvis bildet ikke inneholder relevant tabell-data, returner tomme arrays + note som forklarer hva du så.",
            },
          ],
        },
      ],
    });

    const text = msg.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return { error: "Tomt svar fra AI." };
    }

    type RawOutput = {
      kunder?: Array<Record<string, string | null>>;
      prosjekter?: Array<Record<string, string | null>>;
      brukere?: Array<Record<string, string | null>>;
      note?: string;
    };
    const parsed = safeParseJson<RawOutput>(text.text);
    if (!parsed) {
      return {
        error:
          "Klarte ikke tolke svaret fra AI. Prøv et tydeligere bilde (god kontrast, ikke skjært av).",
      };
    }

    const result: ParsedImageFile = {
      note: parsed.note,
    };

    function buildSheet(
      raw: Array<Record<string, string | null>> | undefined,
      fields: string[],
    ): ParsedImageSheet | undefined {
      if (!raw || raw.length === 0) return undefined;
      const rows: ParsedImageRow[] = raw.map((r, i) => {
        const values: Record<string, string> = {};
        for (const f of fields) {
          const v = r[f];
          values[f] = v == null ? "" : String(v).trim();
        }
        return { values, rowNum: i + 2 };
      });
      return { rows, expectedHeaders: fields };
    }

    result.kunder = buildSheet(parsed.kunder, CUSTOMER_FIELDS);
    result.prosjekter = buildSheet(parsed.prosjekter, PROJECT_FIELDS);
    result.brukere = buildSheet(parsed.brukere, USER_FIELDS);

    return { result };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
