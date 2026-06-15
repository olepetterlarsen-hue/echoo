"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import {
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  FolderOpen,
  UserPlus,
} from "lucide-react";
import {
  bulkImportCustomers,
  bulkImportProjects,
  bulkInviteUsers,
} from "./actions";
import { parseExcelOrCsv, indexFor } from "@/lib/import/tsv-parser";

type Mode = "kunder" | "prosjekter" | "brukere";

const MODES: { id: Mode; label: string; icon: typeof Users; help: string }[] = [
  {
    id: "kunder",
    label: "Kunder",
    icon: Users,
    help:
      "Importer kunder. Eneste obligatoriske felt er name. Eksisterende kunder med samme navn hoppes over.",
  },
  {
    id: "prosjekter",
    label: "Prosjekter",
    icon: FolderOpen,
    help:
      "Importer prosjekter. project_number og title er obligatorisk. Eksisterende prosjektnumre hoppes over. Hvis customer_name matcher en kunde, knyttes prosjektet til den.",
  },
  {
    id: "brukere",
    label: "Brukere",
    icon: UserPlus,
    help:
      "Inviter brukere på e-post. Hver bruker får en invitasjon. Tildelt rolle styres av role-kolonnen (default: elektriker).",
  },
];

const HEADERS: Record<Mode, string[]> = {
  kunder: [
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
  prosjekter: [
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
  brukere: ["email", "full_name", "role", "phone"],
};

interface ParsedRow {
  values: Record<string, string>;
  rowNum: number;
}

interface RunResult {
  ok: true;
  summary: string;
  details: string[];
  errors: string[];
}

interface RunError {
  ok: false;
  error: string;
}

function parseTable(
  text: string,
  expectedHeaders: string[],
): { rows: ParsedRow[]; headerWarning?: string; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { rows: [], error: "Ingen data." };

  const { headers, rows: rawRows } = parseExcelOrCsv(text);
  if (headers.length === 0) return { rows: [], error: "Ingen rader." };

  // Map header → kolonneindeks, fleksibelt
  const indexByField = new Map<string, number>();
  for (const field of expectedHeaders) {
    const idx = indexFor(headers, [field]);
    if (idx !== -1) indexByField.set(field, idx);
  }

  if (indexByField.size === 0) {
    return {
      rows: [],
      error:
        "Fant ingen gyldige kolonneoverskrifter. Forventet en eller flere av: " +
        expectedHeaders.join(", "),
    };
  }

  const usedIndices = new Set(indexByField.values());
  const unknown = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h, i }) => h && !usedIndices.has(i))
    .map(({ h }) => h);
  const headerWarning =
    unknown.length > 0
      ? `Ukjente kolonner ignoreres: ${unknown.join(", ")}`
      : undefined;

  const rows: ParsedRow[] = rawRows.map((cols, i) => {
    const values: Record<string, string> = {};
    for (const [field, idx] of indexByField) {
      values[field] = (cols[idx] ?? "").trim();
    }
    return { values, rowNum: i + 2 }; // +1 for header, +1 for 1-indexed
  });

  return { rows, headerWarning };
}

export function BulkImportClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("kunder");
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RunResult | RunError | null>(null);

  const current = MODES.find((m) => m.id === mode)!;
  const expectedHeaders = HEADERS[mode];
  const parsed = text.trim() ? parseTable(text, expectedHeaders) : null;

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setResult(null);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function onModeChange(m: Mode) {
    setMode(m);
    setText("");
    setResult(null);
  }

  function onImport() {
    if (!parsed || parsed.error || parsed.rows.length === 0) return;
    setResult(null);
    startTransition(async () => {
      try {
        if (mode === "kunder") {
          const res = await bulkImportCustomers({
            rows: parsed.rows.map((r) => ({
              name: r.values.name ?? "",
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
            setResult({ ok: false, error: res.error ?? "Ukjent feil" });
            return;
          }
          setResult({
            ok: true,
            summary: `Opprettet ${res.result.created}, hoppet over ${res.result.skipped} duplikater.`,
            details: [],
            errors: res.result.errors,
          });
        } else if (mode === "prosjekter") {
          const res = await bulkImportProjects({
            rows: parsed.rows.map((r) => ({
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
            setResult({ ok: false, error: res.error ?? "Ukjent feil" });
            return;
          }
          setResult({
            ok: true,
            summary: `Opprettet ${res.result.created} prosjekter, hoppet over ${res.result.skipped} duplikater, knyttet ${res.result.customers_linked} til eksisterende kunde.`,
            details: [],
            errors: res.result.errors,
          });
        } else {
          const res = await bulkInviteUsers({
            rows: parsed.rows.map((r) => ({
              email: r.values.email ?? "",
              full_name: r.values.full_name,
              role: r.values.role,
              phone: r.values.phone,
            })),
          });
          if (res.error || !res.result) {
            setResult({ ok: false, error: res.error ?? "Ukjent feil" });
            return;
          }
          setResult({
            ok: true,
            summary: `Invitert ${res.result.invited} brukere, ${res.result.already_member} var allerede medlem.`,
            details: [],
            errors: res.result.errors,
          });
        }
        router.refresh();
      } catch (e) {
        setResult({ ok: false, error: (e as Error).message });
      }
    });
  }

  const canImport =
    parsed && !parsed.error && parsed.rows.length > 0 && !pending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange(m.id)}
              className={`inline-flex items-center gap-2 px-3 h-9 rounded-md text-sm border transition-colors ${
                active
                  ? "bg-orange text-bg border-orange"
                  : "bg-card hover:bg-card-hover text-text-1 border-border"
              }`}
            >
              <Icon className="size-4" />
              {m.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardBody className="space-y-3">
          <div className="text-sm text-text-2">{current.help}</div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/admin/bulk-import/template/${mode}`}
              className="inline-flex items-center gap-2 px-3 h-9 rounded-md text-sm bg-card hover:bg-card-hover text-text-1 border border-border"
            >
              <Download className="size-4" />
              Last ned CSV-mal
            </Link>
            <label className="inline-flex items-center gap-2 px-3 h-9 rounded-md text-sm bg-card hover:bg-card-hover text-text-1 border border-border cursor-pointer">
              <Upload className="size-4" />
              Last opp CSV-fil
              <input
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                className="hidden"
                onChange={onFileChange}
              />
            </label>
            <span className="text-xs text-text-3">
              Eller lim inn CSV / TSV under (kopier rett fra Excel).
            </span>
          </div>
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setResult(null);
            }}
            rows={8}
            placeholder={`${expectedHeaders.join(",")}\n…`}
            className="font-mono text-xs"
          />
        </CardBody>
      </Card>

      {parsed && parsed.error && (
        <div className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2 flex items-start gap-2">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>{parsed.error}</span>
        </div>
      )}

      {parsed && !parsed.error && (
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="font-medium">{parsed.rows.length}</span> rader
                klar for import.
              </div>
              <Button onClick={onImport} disabled={!canImport}>
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Importerer…
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Importer
                  </>
                )}
              </Button>
            </div>
            {parsed.headerWarning && (
              <div className="text-xs text-text-3 italic">
                {parsed.headerWarning}
              </div>
            )}
            <PreviewTable
              headers={expectedHeaders}
              rows={parsed.rows.slice(0, 20)}
            />
            {parsed.rows.length > 20 && (
              <div className="text-xs text-text-3">
                Viser første 20 av {parsed.rows.length} rader.
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {result && (
        <Card>
          <CardBody className="space-y-2">
            {result.ok ? (
              <>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-green mt-0.5 shrink-0" />
                  <span>{result.summary}</span>
                </div>
                {result.errors.length > 0 && (
                  <div className="border-t border-border pt-2 space-y-1">
                    <div className="text-xs font-medium text-text-2">
                      Feil ({result.errors.length}):
                    </div>
                    <ul className="text-xs text-red space-y-0.5 max-h-48 overflow-auto">
                      {result.errors.map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  </div>
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

function PreviewTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ParsedRow[];
}) {
  return (
    <div className="overflow-auto border border-border rounded-md max-h-96">
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
                  className="px-2 py-1.5 text-text-1 whitespace-nowrap max-w-[200px] truncate"
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
