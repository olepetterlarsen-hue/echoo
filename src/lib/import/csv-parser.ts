// CSV-parser for Sites-import.
// Format: Name (med OPC### + kunde-prefiks), No. of Systems, Address

export interface RawSiteRow {
  rawName: string;
  numSystems: number;
  rawAddress: string;
  // Tolket:
  externalSiteId: string | null;     // OPC###
  siteName: string;                  // Rensket navn (uten OPC-prefix)
  customerName: string;              // Detektert kunde-kjede
  address: string;
  city: string | null;
  postal_code: string | null;
  province: string | null;
}

// Liten enkel CSV-parser som håndterer quoted values og BOM
export function parseCsv(text: string): string[][] {
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (field !== "" || row.length > 0) {
          row.push(field);
          rows.push(row);
        }
        row = [];
        field = "";
        if (ch === "\r" && text[i + 1] === "\n") i++;
      } else {
        field += ch;
      }
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Detekter hvilken kunde-kjede et site tilhører basert på navn.
// Returnerer kunde-navn slik det skal lagres i customers-tabellen.
export function detectCustomer(siteName: string): string {
  const n = siteName.trim();

  // Spesifikke kjeder først (rekkefølge teller)
  const patterns: { match: RegExp; customer: string }[] = [
    { match: /\bREMA(\s*1000)?\b/i, customer: "REMA 1000" },
    { match: /\bKIWI\b/i, customer: "Kiwi" },
    { match: /\bSPAR\b/i, customer: "Spar" },
    { match: /\bINNOM\b/i, customer: "Innom" },
    { match: /\bHSYK\b/i, customer: "Helgelandssykehuset" },
    { match: /\bMENY\b/i, customer: "Meny" },
    { match: /\bCOOP\b/i, customer: "Coop" },
    { match: /\bMAX\s+ARENA\b/i, customer: "Max Arena" },
  ];

  for (const p of patterns) {
    if (p.match.test(n)) return p.customer;
  }

  // Fall back: behold hele navnet som kunde
  return n;
}

// Plukk ut OPC-koden og rens navnet
export function splitNameAndCode(rawName: string): {
  externalSiteId: string | null;
  siteName: string;
} {
  const m = rawName.match(/^(OPC\d+)\s*-?\s*(.*)$/i);
  if (m) {
    return {
      externalSiteId: m[1].toUpperCase(),
      siteName: m[2].trim() || m[1],
    };
  }
  return { externalSiteId: null, siteName: rawName.trim() };
}

// Parse en samlet adressestreng som "Street, City, Region, Norway, 1234"
export function parseAddress(raw: string): {
  address: string;
  city: string | null;
  postal_code: string | null;
  province: string | null;
} {
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Finn postnummer (4-sifret)
  const postalIdx = parts.findIndex((p) => /^\d{4}$/.test(p));
  const postal_code = postalIdx >= 0 ? parts[postalIdx] : null;
  if (postalIdx >= 0) parts.splice(postalIdx, 1);

  // Fjern "Norway"
  const norwayIdx = parts.findIndex((p) => /^Norway$/i.test(p));
  if (norwayIdx >= 0) parts.splice(norwayIdx, 1);

  // Resten: [adresse, by, fylke] omtrentlig
  const address = parts[0] ?? raw;
  const city = parts[1] ?? null;
  const province = parts[2] ?? null;

  return { address, city, postal_code, province };
}

export function parseSitesCsv(text: string): RawSiteRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  // Skip header (første rad)
  const dataRows = rows.slice(1).filter((r) => r.length >= 3 && r[0].trim());

  return dataRows.map((r) => {
    const rawName = r[0].trim();
    const numSystems = parseInt(r[1], 10) || 0;
    const rawAddress = r[2].trim();
    const { externalSiteId, siteName } = splitNameAndCode(rawName);
    const customerName = detectCustomer(siteName);
    const addr = parseAddress(rawAddress);
    return {
      rawName,
      numSystems,
      rawAddress,
      externalSiteId,
      siteName,
      customerName,
      ...addr,
    };
  });
}
