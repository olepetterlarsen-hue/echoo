// Brønnøysundregistrene Enhetsregisteret-oppslag.
// Public API, ingen autentisering. https://data.brreg.no/enhetsregisteret/api/docs

export interface BrregEnhet {
  organisasjonsnummer: string;
  navn: string;
  forretningsadresse?: {
    adresse?: string[];
    postnummer?: string;
    poststed?: string;
    landkode?: string;
  };
  postadresse?: {
    adresse?: string[];
    postnummer?: string;
    poststed?: string;
    landkode?: string;
  };
  organisasjonsform?: { kode?: string; beskrivelse?: string };
  konkurs?: boolean;
  slettedato?: string;
}

export interface BrregLookupResult {
  org_number: string;
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  inactive_reason: string | null;
}

const BASE = "https://data.brreg.no/enhetsregisteret/api/enheter";

function pickAddress(e: BrregEnhet) {
  const addr = e.forretningsadresse ?? e.postadresse;
  if (!addr) return { address: null, postal_code: null, city: null };
  return {
    address: addr.adresse?.join(", ") ?? null,
    postal_code: addr.postnummer ?? null,
    city: addr.poststed ?? null,
  };
}

function toResult(e: BrregEnhet): BrregLookupResult {
  const { address, postal_code, city } = pickAddress(e);
  const inactiveReason = e.slettedato
    ? `Slettet ${e.slettedato}`
    : e.konkurs
      ? "Konkurs"
      : null;
  return {
    org_number: e.organisasjonsnummer,
    name: e.navn,
    address,
    postal_code,
    city,
    inactive_reason: inactiveReason,
  };
}

export async function lookupOrgNumber(
  orgNumber: string,
): Promise<BrregLookupResult | null> {
  const cleaned = orgNumber.replace(/\s+/g, "");
  if (!/^\d{9}$/.test(cleaned)) return null;
  const res = await fetch(`${BASE}/${cleaned}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as BrregEnhet;
  return toResult(data);
}

export async function searchByName(
  query: string,
  limit = 8,
): Promise<BrregLookupResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const url = new URL(BASE);
  url.searchParams.set("navn", trimmed);
  url.searchParams.set("size", String(limit));
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    _embedded?: { enheter?: BrregEnhet[] };
  };
  const enheter = data._embedded?.enheter ?? [];
  return enheter.map(toResult);
}
