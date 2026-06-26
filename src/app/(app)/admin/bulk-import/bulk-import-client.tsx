"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  FolderOpen,
  UserPlus,
  FileSpreadsheet,
  Camera,
  Sparkles,
} from "lucide-react";
// XLSX importeres dynamisk i parseFile() — ~100 KB minified, og brukes
// kun når en admin laster opp Excel. Holder den utenfor hovedbundle.
import type * as XLSXType from "xlsx";
import {
  bulkImportCustomers,
  bulkImportProjects,
  bulkInviteUsers,
  parseImportImage,
} from "./actions";

// ============================================================================
// Felt-mapping per fane — header i Excel → felt i database
// ============================================================================

const CUSTOMER_HEADERS = [
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

const PROJECT_HEADERS = [
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

const USER_HEADERS = ["email", "first_name", "last_name", "role", "phone"];

// Navn på sheets i den nedlastede malen
const SHEET_NAMES = {
  kunder: "Kunder",
  prosjekter: "Prosjekter",
  brukere: "Brukere",
} as const;

// ============================================================================
// Types
// ============================================================================

interface ParsedRow {
  values: Record<string, string>;
  rowNum: number;
}

interface ParsedSheet {
  rows: ParsedRow[];
  expectedHeaders: string[];
  headerWarning?: string;
}

interface ParsedFile {
  kunder?: ParsedSheet;
  prosjekter?: ParsedSheet;
  brukere?: ParsedSheet;
  fileError?: string;
}

interface RunResult {
  ok: true;
  summary: {
    customers?: {
      created: number;
      skipped: number;
      errors: string[];
    };
    projects?: {
      created: number;
      skipped: number;
      customers_linked: number;
      errors: string[];
    };
    users?: {
      invited: number;
      already_member: number;
      errors: string[];
    };
  };
}

interface RunError {
  ok: false;
  error: string;
}

// ============================================================================
// Parser
// ============================================================================

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[\s./-]+/g, "_");
}

function parseSheet(
  XLSX: typeof XLSXType,
  ws: XLSXType.WorkSheet,
  expectedHeaders: string[],
): ParsedSheet | undefined {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: "",
    raw: false,
  }) as string[][];
  if (aoa.length === 0) return undefined;

  const rawHeaders = aoa[0].map((c) => normalizeHeader(String(c ?? "")));
  // Map header-index → expected-felt
  const indexByField = new Map<string, number>();
  for (const field of expectedHeaders) {
    const idx = rawHeaders.indexOf(field);
    if (idx !== -1) indexByField.set(field, idx);
  }
  if (indexByField.size === 0) return undefined;

  const usedIndices = new Set(indexByField.values());
  const unknown = rawHeaders
    .map((h, i) => ({ h, i }))
    .filter(({ h, i }) => h && !usedIndices.has(i))
    .map(({ h }) => h);
  const headerWarning =
    unknown.length > 0
      ? `Ukjente kolonner i fanen ignoreres: ${unknown.join(", ")}`
      : undefined;

  const rows: ParsedRow[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const cols = aoa[i];
    if (!cols || cols.every((c) => !c || !String(c).trim())) continue;
    const values: Record<string, string> = {};
    let hasAny = false;
    for (const [field, idx] of indexByField) {
      const v = String(cols[idx] ?? "").trim();
      values[field] = v;
      if (v) hasAny = true;
    }
    if (hasAny) rows.push({ values, rowNum: i + 1 });
  }

  return { rows, expectedHeaders, headerWarning };
}

async function parseFile(file: File): Promise<ParsedFile> {
  try {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    const kunderSheet = wb.Sheets[SHEET_NAMES.kunder];
    const prosjekterSheet = wb.Sheets[SHEET_NAMES.prosjekter];
    const brukereSheet = wb.Sheets[SHEET_NAMES.brukere];

    return {
      kunder: kunderSheet ? parseSheet(XLSX, kunderSheet, CUSTOMER_HEADERS) : undefined,
      prosjekter: prosjekterSheet
        ? parseSheet(XLSX, prosjekterSheet, PROJECT_HEADERS)
        : undefined,
      brukere: brukereSheet ? parseSheet(XLSX, brukereSheet, USER_HEADERS) : undefined,
    };
  } catch (e) {
    return { fileError: (e as Error).message };
  }
}

// ============================================================================
// Komponent
// ============================================================================

export function BulkImportClient() {
  const router = useRouter();
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RunResult | RunError | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setAiNote(null);
    setImageError(null);
    const p = await parseFile(file);
    setParsed(p);
    e.target.value = "";
  }

  async function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setImageError("Bare PNG, JPG, WEBP eller GIF støttes.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError(
        "Bildet er over 5 MB. Komprimér det eller crop ned før opplasting.",
      );
      return;
    }

    setFileName(file.name);
    setResult(null);
    setAiNote(null);
    setImageError(null);
    setParsed(null);
    setImageProcessing(true);

    try {
      const base64 = await fileToBase64(file);
      const res = await parseImportImage({
        base64,
        mediaType: file.type as
          | "image/jpeg"
          | "image/png"
          | "image/webp"
          | "image/gif",
      });
      if (res.error || !res.result) {
        setImageError(res.error ?? "AI kunne ikke tolke bildet.");
        return;
      }
      setAiNote(res.result.note ?? null);
      // Mapper image-resultat over til samme ParsedFile-format som xlsx-flyten
      setParsed({
        kunder: res.result.kunder
          ? {
              rows: res.result.kunder.rows,
              expectedHeaders: res.result.kunder.expectedHeaders,
            }
          : undefined,
        prosjekter: res.result.prosjekter
          ? {
              rows: res.result.prosjekter.rows,
              expectedHeaders: res.result.prosjekter.expectedHeaders,
            }
          : undefined,
        brukere: res.result.brukere
          ? {
              rows: res.result.brukere.rows,
              expectedHeaders: res.result.brukere.expectedHeaders,
            }
          : undefined,
      });
    } catch (err) {
      setImageError((err as Error).message);
    } finally {
      setImageProcessing(false);
    }
  }

  function reset() {
    setParsed(null);
    setFileName(null);
    setResult(null);
    setAiNote(null);
    setImageError(null);
  }

  const totalRows =
    (parsed?.kunder?.rows.length ?? 0) +
    (parsed?.prosjekter?.rows.length ?? 0) +
    (parsed?.brukere?.rows.length ?? 0);
  const canImport = totalRows > 0 && !pending;

  function onImport() {
    if (!parsed || totalRows === 0) return;
    setResult(null);
    startTransition(async () => {
      const summary: RunResult["summary"] = {};

      // Kunder først — prosjekter kan så koble seg til
      if (parsed.kunder && parsed.kunder.rows.length > 0) {
        try {
          const res = await bulkImportCustomers({
            rows: parsed.kunder.rows.map((r) => ({
              customer_type: r.values.customer_type,
              first_name: r.values.first_name,
              last_name: r.values.last_name,
              name: r.values.name ?? deriveNameFromPrivat(r.values),
              org_number: r.values.org_number,
              contact_person: r.values.contact_person,
              email: r.values.email,
              phone: r.values.phone,
              address: r.values.address,
              postal_code: r.values.postal_code,
              city: r.values.city,
              notes: r.values.notes,
            })),
          });
          if (res.error || !res.result) {
            summary.customers = {
              created: 0,
              skipped: 0,
              errors: [res.error ?? "Ukjent feil"],
            };
          } else {
            summary.customers = res.result;
          }
        } catch (e) {
          summary.customers = {
            created: 0,
            skipped: 0,
            errors: [(e as Error).message],
          };
        }
      }

      // Prosjekter
      if (parsed.prosjekter && parsed.prosjekter.rows.length > 0) {
        try {
          const res = await bulkImportProjects({
            rows: parsed.prosjekter.rows.map((r) => ({
              project_number: r.values.project_number ?? "",
              title: r.values.title ?? "",
              customer_name: r.values.customer_name,
              customer_org_number: r.values.customer_org_number,
              customer_contact: r.values.customer_contact,
              customer_email: r.values.customer_email,
              customer_phone: r.values.customer_phone,
              site_address: r.values.site_address,
              site_postal_code: r.values.site_postal_code,
              site_city: r.values.site_city,
              status: r.values.status,
              scheduled_start_date: r.values.scheduled_start_date,
              scheduled_end_date: r.values.scheduled_end_date,
              notes: r.values.notes,
            })),
          });
          if (res.error || !res.result) {
            summary.projects = {
              created: 0,
              skipped: 0,
              customers_linked: 0,
              errors: [res.error ?? "Ukjent feil"],
            };
          } else {
            summary.projects = res.result;
          }
        } catch (e) {
          summary.projects = {
            created: 0,
            skipped: 0,
            customers_linked: 0,
            errors: [(e as Error).message],
          };
        }
      }

      // Brukere SIST — failet bruker-import skal IKKE blokke kunder/prosjekter
      // som allerede er kjørt. Vi merker feil og fortsetter.
      if (parsed.brukere && parsed.brukere.rows.length > 0) {
        try {
          const res = await bulkInviteUsers({
            rows: parsed.brukere.rows.map((r) => ({
              email: r.values.email ?? "",
              full_name:
                [r.values.first_name, r.values.last_name]
                  .filter(Boolean)
                  .join(" ") || undefined,
              role: r.values.role,
              phone: r.values.phone,
            })),
          });
          if (res.error || !res.result) {
            summary.users = {
              invited: 0,
              already_member: 0,
              errors: [res.error ?? "Ukjent feil"],
            };
          } else {
            summary.users = res.result;
          }
        } catch (e) {
          summary.users = {
            invited: 0,
            already_member: 0,
            errors: [
              `Bruker-invitasjoner feilet: ${(e as Error).message}. Kunder/prosjekter ble importert.`,
            ],
          };
        }
      }

      setResult({ ok: true, summary });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3">
          <p className="text-sm text-text-2">
            Last ned malen (ett Excel-dokument med 3 faner: Kunder, Prosjekter,
            Brukere). Fyll ut i Excel og last opp samme fil tilbake — alt
            importeres i én operasjon. Tomme faner ignoreres.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/bulk-import/template"
              className="inline-flex items-center gap-2 px-3 h-9 rounded-md text-sm bg-card hover:bg-card-hover text-text-1 border border-border"
            >
              <Download className="size-4" />
              Last ned Excel-mal (.xlsx)
            </Link>
            <label className="inline-flex items-center gap-2 px-3 h-9 rounded-md text-sm bg-orange/15 hover:bg-orange/25 text-orange border border-orange/30 cursor-pointer">
              <Upload className="size-4" />
              Last opp utfylt Excel-fil
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={onFileChange}
              />
            </label>
            <label
              className={`inline-flex items-center gap-2 px-3 h-9 rounded-md text-sm border cursor-pointer transition-colors ${
                imageProcessing
                  ? "bg-card text-text-3 border-border cursor-wait"
                  : "bg-card hover:bg-card-hover text-text-1 border-border"
              }`}
            >
              {imageProcessing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              {imageProcessing ? "AI tolker bildet…" : "Eller last opp skjermbilde (AI)"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                capture="environment"
                className="hidden"
                disabled={imageProcessing}
                onChange={onImageChange}
              />
            </label>
            {fileName && (
              <span className="text-xs text-text-3 inline-flex items-center gap-1">
                <FileSpreadsheet className="size-3.5" />
                {fileName}
              </span>
            )}
          </div>
          <div className="text-xs text-text-3">
            Skjermbilde: dra inn et bilde av kundelisten eller prosjektoversikten
            din fra et annet system (Visma, Tripletex, Excel, e-post). Claude
            Vision trekker ut radene og legger dem i samme preview-flyt — du
            godkjenner før noe lagres.
          </div>
        </CardBody>
      </Card>

      {imageError && (
        <div className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2 flex items-start gap-2">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>{imageError}</span>
        </div>
      )}

      {aiNote && (
        <div className="text-sm text-orange bg-orange/10 border border-orange/30 rounded px-3 py-2 flex items-start gap-2">
          <Sparkles className="size-4 mt-0.5 shrink-0" />
          <span>
            <strong>AI-tolkning:</strong> {aiNote}
          </span>
        </div>
      )}

      {parsed?.fileError && (
        <div className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2 flex items-start gap-2">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>Klarte ikke lese filen: {parsed.fileError}</span>
        </div>
      )}

      {parsed && !parsed.fileError && (
        <>
          <SheetSummary
            icon={<Users className="size-4 text-orange" />}
            label="Kunder"
            sheet={parsed.kunder}
            expectedHeaders={CUSTOMER_HEADERS}
          />
          <SheetSummary
            icon={<FolderOpen className="size-4 text-orange" />}
            label="Prosjekter"
            sheet={parsed.prosjekter}
            expectedHeaders={PROJECT_HEADERS}
          />
          <SheetSummary
            icon={<UserPlus className="size-4 text-orange" />}
            label="Brukere"
            sheet={parsed.brukere}
            expectedHeaders={USER_HEADERS}
          />

          <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
            <span className="text-sm text-text-2">
              Totalt <span className="font-medium text-text-1">{totalRows}</span>{" "}
              rader klar for import.
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={reset} disabled={pending}>
                Avbryt
              </Button>
              <Button onClick={onImport} disabled={!canImport}>
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Importerer…
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Importer alt
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {result && (
        <Card>
          <CardBody className="space-y-3">
            {result.ok ? (
              <>
                {result.summary.customers && (
                  <ResultLine
                    label="Kunder"
                    summary={`Opprettet ${result.summary.customers.created}, hoppet over ${result.summary.customers.skipped} duplikater.`}
                    errors={result.summary.customers.errors}
                  />
                )}
                {result.summary.projects && (
                  <ResultLine
                    label="Prosjekter"
                    summary={`Opprettet ${result.summary.projects.created}, hoppet over ${result.summary.projects.skipped} duplikater, koblet ${result.summary.projects.customers_linked} til eksisterende kunde.`}
                    errors={result.summary.projects.errors}
                  />
                )}
                {result.summary.users && (
                  <ResultLine
                    label="Brukere"
                    summary={`Invitert ${result.summary.users.invited}, ${result.summary.users.already_member} var allerede medlem.`}
                    errors={result.summary.users.errors}
                  />
                )}
              </>
            ) : (
              <div className="flex items-start gap-2 text-sm text-red">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <span>{result.error}</span>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("FileReader feil"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Forventet string fra FileReader"));
        return;
      }
      // result er "data:image/png;base64,XXXX" — vi trenger kun base64-delen
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

function deriveNameFromPrivat(v: Record<string, string>): string {
  // Privatkunder kan ha tom 'name' og fornavn/etternavn fylt ut.
  // Vi bygger visningsnavn fra dem for å oppfylle NOT NULL på customers.name.
  const first = v.first_name?.trim();
  const last = v.last_name?.trim();
  if (first || last) return [first, last].filter(Boolean).join(" ");
  return "";
}

function SheetSummary({
  icon,
  label,
  sheet,
  expectedHeaders,
}: {
  icon: React.ReactNode;
  label: string;
  sheet: ParsedSheet | undefined;
  expectedHeaders: string[];
}) {
  if (!sheet) {
    return (
      <Card>
        <CardBody className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-text-3">
            {icon}
            <span>
              <span className="font-medium text-text-2">{label}</span> — fanen
              mangler eller ble ikke gjenkjent
            </span>
          </div>
        </CardBody>
      </Card>
    );
  }
  if (sheet.rows.length === 0) {
    return (
      <Card>
        <CardBody className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-text-3">
            {icon}
            <span>
              <span className="font-medium text-text-2">{label}</span> — fanen
              er tom, ingen rader å importere
            </span>
          </div>
        </CardBody>
      </Card>
    );
  }
  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            {icon}
            <span className="font-medium text-text-1">{label}</span>
            <span className="text-text-3">
              {sheet.rows.length} rader
            </span>
          </div>
        </div>
        {sheet.headerWarning && (
          <div className="text-xs text-text-3 italic">{sheet.headerWarning}</div>
        )}
        <PreviewTable headers={expectedHeaders} rows={sheet.rows.slice(0, 5)} />
        {sheet.rows.length > 5 && (
          <div className="text-xs text-text-3">
            Viser første 5 av {sheet.rows.length} rader.
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function PreviewTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ParsedRow[];
}) {
  return (
    <div className="overflow-auto border border-border rounded-md max-h-48">
      <table className="w-full text-xs">
        <thead className="bg-card sticky top-0">
          <tr>
            <th className="text-left px-2 py-1.5 font-medium text-text-3 border-b border-border">
              #
            </th>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-2 py-1.5 font-medium text-text-2 border-b border-border whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rowNum} className="border-b border-border/50">
              <td className="px-2 py-1.5 text-text-3">{r.rowNum}</td>
              {headers.map((h) => (
                <td
                  key={h}
                  className="px-2 py-1.5 text-text-1 whitespace-nowrap max-w-[160px] truncate"
                  title={r.values[h] ?? ""}
                >
                  {r.values[h] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultLine({
  label,
  summary,
  errors,
}: {
  label: string;
  summary: string;
  errors: string[];
}) {
  const hasErrors = errors.length > 0;
  return (
    <div className="border border-border rounded-md p-3 space-y-1">
      <div className="flex items-start gap-2 text-sm">
        {hasErrors ? (
          <AlertCircle className="size-4 text-yellow mt-0.5 shrink-0" />
        ) : (
          <CheckCircle2 className="size-4 text-green mt-0.5 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="font-medium text-text-1">{label}</div>
          <div className="text-text-2 text-xs">{summary}</div>
        </div>
      </div>
      {hasErrors && (
        <ul className="text-xs text-red space-y-0.5 mt-1 ml-6 max-h-32 overflow-auto">
          {errors.map((e, idx) => (
            <li key={idx}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
