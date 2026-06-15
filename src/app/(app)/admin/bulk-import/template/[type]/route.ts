import { NextResponse, type NextRequest } from "next/server";
import { buildCsv } from "@/lib/import/tsv-parser";

interface RouteContext {
  params: Promise<{ type: string }>;
}

const TEMPLATES: Record<
  string,
  { filename: string; headers: string[]; example: string[] }
> = {
  kunder: {
    filename: "kunder-mal.csv",
    headers: [
      "name",
      "org_number",
      "contact_person",
      "email",
      "phone",
      "address",
      "postal_code",
      "city",
      "notes",
    ],
    example: [
      "Eksempel Bygg AS",
      "987654321",
      "Kari Nordmann",
      "kari@eksempel.no",
      "+47 900 00 000",
      "Storgata 1",
      "0123",
      "Oslo",
      "Eksisterende kunde",
    ],
  },
  prosjekter: {
    filename: "prosjekter-mal.csv",
    headers: [
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
    example: [
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
      "",
    ],
  },
  brukere: {
    filename: "brukere-mal.csv",
    headers: ["email", "full_name", "role", "phone"],
    example: [
      "ola@firma.no",
      "Ola Nordmann",
      "elektriker",
      "+47 900 00 000",
    ],
  },
};

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { type } = await ctx.params;
  const tpl = TEMPLATES[type];
  if (!tpl) {
    return NextResponse.json({ error: "Ukjent mal" }, { status: 404 });
  }
  const csv = buildCsv(tpl.headers, [tpl.example]);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tpl.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
