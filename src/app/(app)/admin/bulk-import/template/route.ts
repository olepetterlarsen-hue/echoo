import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

/**
 * Returnerer ett Excel-dokument med tre fane-baseplater:
 *   Kunder | Prosjekter | Brukere
 *
 * Brukeren fyller ut det de vil i én fil, laster opp samme fil tilbake,
 * og importen tolker hver fane separat. Tomme faner ignoreres.
 *
 * Privatkunder identifiseres ved customer_type=privat + fornavn/etternavn.
 * Bedriftskunder ved customer_type=bedrift + navn + orgnr.
 */

const SHEETS: Array<{
  name: string;
  rows: (string | number | null)[][];
}> = [
  {
    name: "Kunder",
    rows: [
      [
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
      ],
      // Eksempel-rader (slett før du fyller egne)
      [
        "bedrift",
        "Eksempel Bygg AS",
        null,
        null,
        "987654321",
        "Kari Nordmann",
        "kari@eksempel.no",
        "+47 900 00 000",
        "Storgata 1",
        "0123",
        "Oslo",
        "Eksisterende kunde",
      ],
      [
        "privat",
        null,
        "Ola",
        "Hansen",
        null,
        null,
        "ola.hansen@example.no",
        "+47 901 11 222",
        "Bakkegata 5",
        "0560",
        "Oslo",
        "Privat oppdragsgiver",
      ],
    ],
  },
  {
    name: "Prosjekter",
    rows: [
      [
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
      ],
      [
        "2026-001",
        "Nybygg Storgata 1",
        "Eksempel Bygg AS",
        "987654321",
        "Kari Nordmann",
        "kari@eksempel.no",
        "+47 900 00 000",
        "Storgata 1",
        "0123",
        "Oslo",
        "aktiv",
        "2026-07-01",
        "2026-09-30",
        null,
      ],
    ],
  },
  {
    name: "Brukere",
    rows: [
      ["email", "first_name", "last_name", "role", "phone"],
      [
        "ola@firma.no",
        "Ola",
        "Nordmann",
        "elektriker",
        "+47 900 00 000",
      ],
      [
        "kari@firma.no",
        "Kari",
        "Pedersen",
        "prosjektleder",
        "+47 901 22 333",
      ],
    ],
  },
];

export async function GET() {
  const wb = XLSX.utils.book_new();
  for (const sheet of SHEETS) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="echoo-bulk-import-mal.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
