"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  commitSubstanceList,
  classifySdsPdf,
  sdsUploadPath,
  type SubstanceRow,
} from "./actions";
import type { GhsCode } from "@/lib/ghs-pictograms";

type Tab = "list" | "sds";

const EXPECTED_HEADERS = [
  { key: "name", aliases: ["navn", "name", "produkt"] },
  { key: "manufacturer", aliases: ["produsent", "manufacturer", "leverandør"] },
  { key: "cas_number", aliases: ["cas", "cas-nr", "cas_number"] },
  { key: "usage_area", aliases: ["bruk", "bruksområde", "usage"] },
  { key: "storage_location", aliases: ["lagring", "lagringssted", "location"] },
  { key: "quantity_estimate", aliases: ["mengde", "quantity"] },
  { key: "notes", aliases: ["notat", "kommentar", "notes"] },
];

export function ImportClient() {
  const [tab, setTab] = useState<Tab>("list");
  return (
    <div className="space-y-4">
      <div className="flex border-b border-border gap-1">
        <TabButton active={tab === "list"} onClick={() => setTab("list")}>
          <FileText className="size-4" />
          Lim inn liste
        </TabButton>
        <TabButton active={tab === "sds"} onClick={() => setTab("sds")}>
          <Sparkles className="size-4" />
          Last opp SDS-PDFer
        </TabButton>
      </div>
      {tab === "list" ? <ListMode /> : <SdsMode />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
        active
          ? "border-orange text-orange"
          : "border-transparent text-text-2 hover:text-text-1"
      }`}
    >
      {children}
    </button>
  );
}

/* ============================================================
   List mode — paste CSV/TSV
   ============================================================ */

function parseList(text: string): {
  rows: SubstanceRow[];
  warnings: string[];
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [], warnings: ["Ingen data."] };

  // Detekt skilletegn
  const sample = lines[0];
  const tabCount = (sample.match(/\t/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;
  const sep = tabCount >= Math.max(commaCount, semiCount)
    ? "\t"
    : semiCount > commaCount
      ? ";"
      : ",";

  // Headers fra første linje
  const headerCells = lines[0].split(sep).map((c) => c.trim().toLowerCase());
  const colMap: Record<number, keyof SubstanceRow> = {};
  const warnings: string[] = [];

  for (let i = 0; i < headerCells.length; i++) {
    const cell = headerCells[i];
    const match = EXPECTED_HEADERS.find((h) =>
      h.aliases.some((a) => cell === a || cell.includes(a)),
    );
    if (match) {
      colMap[i] = match.key as keyof SubstanceRow;
    }
  }

  if (!Object.values(colMap).includes("name" as keyof SubstanceRow)) {
    warnings.push(
      "Fant ikke kolonnen \"Navn\". Første rad må være header-rad. Eksempel: Navn, Produsent, CAS, Bruksområde, Lagring, Mengde, Notat",
    );
    return { rows: [], warnings };
  }

  const rows: SubstanceRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = lines[r].split(sep).map((c) => c.trim());
    const row: SubstanceRow = { name: "" };
    for (const [iStr, key] of Object.entries(colMap)) {
      const i = Number(iStr);
      const v = cells[i] ?? "";
      (row as unknown as Record<string, string>)[key] = v;
    }
    if (row.name) rows.push(row);
  }

  return { rows, warnings };
}

function ListMode() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<SubstanceRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    inserted?: number;
    errors?: Array<{ row: number; error: string }>;
  } | null>(null);

  function onParse() {
    const { rows, warnings } = parseList(text);
    setParsed(rows);
    setWarnings(warnings);
    setResult(null);
  }

  function onCommit() {
    if (parsed.length === 0) return;
    startTransition(async () => {
      const res = await commitSubstanceList({ rows: parsed });
      setResult(res);
      if (res.inserted && res.inserted > 0) {
        setTimeout(() => {
          router.push("/stoffkartotek");
          router.refresh();
        }, 1500);
      }
    });
  }

  function updateCell(idx: number, key: keyof SubstanceRow, val: string) {
    setParsed((curr) =>
      curr.map((r, i) => (i === idx ? { ...r, [key]: val } : r)),
    );
  }

  function removeRow(idx: number) {
    setParsed((curr) => curr.filter((_, i) => i !== idx));
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="text-sm text-text-2">
          Lim inn data fra Excel, Google Sheets eller CSV-fil. Første rad må
          være header — navn på kolonnene gjenkjennes automatisk.
        </div>
        <details className="border border-border rounded-md">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
            Forventet format
          </summary>
          <div className="p-3 border-t border-border text-xs text-text-2 space-y-2">
            <p>
              Skilletegn auto-detektes (tab, komma eller semikolon).
              Kolonne-navn som gjenkjennes:
            </p>
            <pre className="bg-card-hover rounded p-2 font-mono text-[11px] overflow-x-auto">
{`Navn          → name (påkrevd)
Produsent     → manufacturer
CAS           → cas_number
Bruksområde   → usage_area
Lagring       → storage_location
Mengde        → quantity_estimate
Notat         → notes`}
            </pre>
            <p className="text-text-3">
              Tips: GHS-piktogrammer og H/P-setninger må fylles inn manuelt
              etterpå, eller bruk SDS-PDF-modus.
            </p>
          </div>
        </details>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Navn\tProdusent\tCAS\tBruksområde\tLagring\nIsopropanol\tVWR\t67-63-0\tRens av kontakter\tKjemikalielager A\nDielektrisk fett\tNexans\t-\tIsolering\tVerksted\n…`}
          rows={6}
          className="w-full rounded-md px-3 py-2 text-sm bg-card border border-border focus:border-orange focus:outline-none font-mono resize-y"
        />
        <div className="flex gap-2">
          <Button onClick={onParse} disabled={!text.trim()}>
            Parse listen
          </Button>
          <Button variant="ghost" onClick={() => { setText(""); setParsed([]); setWarnings([]); setResult(null); }}>
            Nullstill
          </Button>
        </div>

        {warnings.length > 0 && (
          <div className="bg-yellow/10 border border-yellow/30 rounded-md px-3 py-2 text-sm text-yellow space-y-1">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {parsed.length > 0 && (
          <>
            <div className="text-sm text-text-2 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green" />
              Fant <strong>{parsed.length}</strong> rader klare for import.
              Du kan redigere før du importerer.
            </div>
            <div className="border border-border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-card-hover text-text-3 text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2">Navn</th>
                    <th className="text-left px-3 py-2">Produsent</th>
                    <th className="text-left px-3 py-2">CAS</th>
                    <th className="text-left px-3 py-2">Bruksområde</th>
                    <th className="text-left px-3 py-2">Lagring</th>
                    <th className="text-left px-3 py-2">Mengde</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsed.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1">
                        <input
                          value={r.name}
                          onChange={(e) => updateCell(i, "name", e.target.value)}
                          className="w-full bg-transparent border-0 focus:bg-card-hover rounded px-1"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <input
                          value={r.manufacturer ?? ""}
                          onChange={(e) =>
                            updateCell(i, "manufacturer", e.target.value)
                          }
                          className="w-full bg-transparent border-0 focus:bg-card-hover rounded px-1"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <input
                          value={r.cas_number ?? ""}
                          onChange={(e) =>
                            updateCell(i, "cas_number", e.target.value)
                          }
                          className="w-full bg-transparent border-0 focus:bg-card-hover rounded px-1"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <input
                          value={r.usage_area ?? ""}
                          onChange={(e) =>
                            updateCell(i, "usage_area", e.target.value)
                          }
                          className="w-full bg-transparent border-0 focus:bg-card-hover rounded px-1"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <input
                          value={r.storage_location ?? ""}
                          onChange={(e) =>
                            updateCell(i, "storage_location", e.target.value)
                          }
                          className="w-full bg-transparent border-0 focus:bg-card-hover rounded px-1"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <input
                          value={r.quantity_estimate ?? ""}
                          onChange={(e) =>
                            updateCell(i, "quantity_estimate", e.target.value)
                          }
                          className="w-full bg-transparent border-0 focus:bg-card-hover rounded px-1"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <button
                          onClick={() => removeRow(i)}
                          className="text-text-3 hover:text-red"
                          aria-label="Fjern rad"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onCommit} disabled={pending || parsed.length === 0}>
                {pending ? "Importerer…" : `Importer ${parsed.length} stoff`}
              </Button>
              <Link href="/stoffkartotek">
                <Button variant="ghost">Avbryt</Button>
              </Link>
            </div>

            {result && (
              <div className="space-y-2">
                {result.inserted !== undefined && result.inserted > 0 && (
                  <div className="bg-green/10 border border-green/30 rounded-md px-3 py-2 text-sm text-green flex items-center gap-2">
                    <CheckCircle2 className="size-4" />
                    Importerte {result.inserted} stoff. Sender deg til
                    /stoffkartotek…
                  </div>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div className="bg-red/10 border border-red/30 rounded-md px-3 py-2 text-sm text-red">
                    {result.errors.map((e, i) => (
                      <div key={i}>
                        Rad {e.row}: {e.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

/* ============================================================
   SDS PDF mode — multi-upload + AI-extraksjon
   ============================================================ */

type SdsStatus =
  | "uploading"
  | "extracting"
  | "ready"
  | "committing"
  | "done"
  | "error";

interface SdsItem {
  localId: string;
  filename: string;
  path: string | null;
  status: SdsStatus;
  extracted: {
    name: string;
    manufacturer: string;
    cas_number: string;
    ghs_pictograms: GhsCode[];
    hazard_statements: string;
    precautionary_measures: string;
    sds_revision_date: string;
    usage_area: string;
    confidence: number;
  } | null;
  error?: string;
}

function SdsMode() {
  const router = useRouter();
  const [items, setItems] = useState<SdsItem[]>([]);
  const [pending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);

  function patchItem(id: string, p: Partial<SdsItem>) {
    setItems((curr) =>
      curr.map((it) => (it.localId === id ? { ...it, ...p } : it)),
    );
  }

  function patchExtracted(
    id: string,
    field: keyof NonNullable<SdsItem["extracted"]>,
    value: string,
  ) {
    setItems((curr) =>
      curr.map((it) =>
        it.localId === id && it.extracted
          ? { ...it, extracted: { ...it.extracted, [field]: value } }
          : it,
      ),
    );
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setGlobalError(null);
    const supabase = createBrowserClient();

    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf") {
        setGlobalError("Bare PDF-filer støttes — konverter andre formater først.");
        continue;
      }
      const localId = crypto.randomUUID();
      const item: SdsItem = {
        localId,
        filename: file.name,
        path: null,
        status: "uploading",
        extracted: null,
      };
      setItems((curr) => [...curr, item]);

      const pathRes = await sdsUploadPath({ filename: file.name });
      if (pathRes.error || !pathRes.path) {
        patchItem(localId, { status: "error", error: pathRes.error });
        continue;
      }

      const { error: upErr } = await supabase.storage
        .from("substance-sds")
        .upload(pathRes.path, file, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (upErr) {
        patchItem(localId, { status: "error", error: upErr.message });
        continue;
      }

      patchItem(localId, { path: pathRes.path, status: "extracting" });

      const extractRes = await classifySdsPdf({ path: pathRes.path });
      if (extractRes.error || !extractRes.extracted) {
        patchItem(localId, {
          status: "error",
          error: extractRes.error,
          path: pathRes.path,
        });
        continue;
      }
      patchItem(localId, {
        extracted: extractRes.extracted,
        status: "ready",
      });
    }
  }

  async function commitAll() {
    const ready = items.filter(
      (it) => it.status === "ready" && it.extracted && it.path,
    );
    if (ready.length === 0) return;
    ready.forEach((it) => patchItem(it.localId, { status: "committing" }));
    startTransition(async () => {
      const rows: SubstanceRow[] = ready.map((it) => ({
        name: it.extracted!.name,
        manufacturer: it.extracted!.manufacturer,
        cas_number: it.extracted!.cas_number,
        usage_area: it.extracted!.usage_area,
        ghs_pictograms: it.extracted!.ghs_pictograms,
        hazard_statements: it.extracted!.hazard_statements,
        precautionary_measures: it.extracted!.precautionary_measures,
        sds_file_path: it.path!,
        sds_revision_date: it.extracted!.sds_revision_date || undefined,
      }));
      const res = await commitSubstanceList({ rows });
      if (res.errors && res.errors.length > 0) {
        ready.forEach((it) => patchItem(it.localId, { status: "ready" }));
        setGlobalError(res.errors[0].error);
        return;
      }
      ready.forEach((it) => patchItem(it.localId, { status: "done" }));
      setTimeout(() => {
        router.push("/stoffkartotek");
        router.refresh();
      }, 1500);
    });
  }

  function toggleGhs(id: string, code: GhsCode) {
    setItems((curr) =>
      curr.map((it) => {
        if (it.localId !== id || !it.extracted) return it;
        const has = it.extracted.ghs_pictograms.includes(code);
        return {
          ...it,
          extracted: {
            ...it.extracted,
            ghs_pictograms: has
              ? it.extracted.ghs_pictograms.filter((c) => c !== code)
              : [...it.extracted.ghs_pictograms, code],
          },
        };
      }),
    );
  }

  const allReady = items.every((it) => it.status === "ready" || it.status === "done");
  const readyCount = items.filter((it) => it.status === "ready").length;

  return (
    <Card>
      <CardBody className="space-y-4">
        <label className="block border-2 border-dashed border-border rounded-md p-8 text-center cursor-pointer hover:bg-card-hover transition-colors">
          <Upload className="size-6 mx-auto text-text-3 mb-2" />
          <div className="text-sm font-medium text-text-1">
            Last opp SDS-PDFer
          </div>
          <div className="text-xs text-text-3 mt-1">
            Velg flere filer samtidig. AI ekstraherer navn, produsent, CAS,
            GHS-piktogrammer og H/P-setninger fra hver fil.
          </div>
          <input
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>

        {globalError && (
          <div className="bg-red/10 border border-red/30 rounded-md px-3 py-2 text-sm text-red flex items-center gap-2">
            <AlertCircle className="size-4" />
            {globalError}
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-3">
            {items.map((it) => (
              <SdsItemRow
                key={it.localId}
                item={it}
                onUpdate={(field, value) =>
                  patchExtracted(it.localId, field, value)
                }
                onToggleGhs={(code) => toggleGhs(it.localId, code)}
              />
            ))}
            {allReady && readyCount > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button onClick={commitAll} disabled={pending}>
                  {pending
                    ? "Importerer…"
                    : `Importer ${readyCount} stoff til kartoteket`}
                </Button>
                <Link href="/stoffkartotek">
                  <Button variant="ghost">Avbryt</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function SdsItemRow({
  item,
  onUpdate,
  onToggleGhs,
}: {
  item: SdsItem;
  onUpdate: (
    field: keyof NonNullable<SdsItem["extracted"]>,
    value: string,
  ) => void;
  onToggleGhs: (code: GhsCode) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-md p-3 space-y-2">
      <div className="flex items-start gap-2">
        <StatusIcon status={item.status} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-1 truncate">
            {item.filename}
          </div>
          <div className="text-xs text-text-3">
            {labelFor(item.status)}
            {item.extracted &&
              ` · confidence ${Math.round(item.extracted.confidence * 100)}%`}
          </div>
        </div>
      </div>
      {item.error && (
        <div className="text-xs text-red">{item.error}</div>
      )}
      {item.extracted && item.status !== "uploading" && item.status !== "extracting" && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Cell label="Navn">
              <input
                value={item.extracted.name}
                onChange={(e) => onUpdate("name", e.target.value)}
                className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm"
              />
            </Cell>
            <Cell label="Produsent">
              <input
                value={item.extracted.manufacturer}
                onChange={(e) => onUpdate("manufacturer", e.target.value)}
                className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm"
              />
            </Cell>
            <Cell label="CAS-nr">
              <input
                value={item.extracted.cas_number}
                onChange={(e) => onUpdate("cas_number", e.target.value)}
                className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm"
              />
            </Cell>
            <Cell label="Revisjonsdato">
              <input
                type="date"
                value={item.extracted.sds_revision_date}
                onChange={(e) => onUpdate("sds_revision_date", e.target.value)}
                className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm"
              />
            </Cell>
          </div>
          <Cell label="GHS-piktogrammer">
            <div className="flex flex-wrap gap-1.5">
              {(["GHS01", "GHS02", "GHS03", "GHS04", "GHS05", "GHS06", "GHS07", "GHS08", "GHS09"] as GhsCode[]).map((c) => {
                const active = item.extracted!.ghs_pictograms.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onToggleGhs(c)}
                    className={`px-2 py-0.5 rounded-md text-xs border ${
                      active
                        ? "bg-orange/15 text-orange border-orange"
                        : "bg-card border-border text-text-3 hover:bg-card-hover"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </Cell>
          <Cell label="H-setninger">
            <textarea
              value={item.extracted.hazard_statements}
              onChange={(e) => onUpdate("hazard_statements", e.target.value)}
              rows={2}
              className="w-full bg-transparent border border-border rounded px-2 py-1 text-xs"
            />
          </Cell>
        </div>
      )}
    </div>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-text-3 mb-0.5">{label}</div>
      {children}
    </div>
  );
}

function StatusIcon({ status }: { status: SdsStatus }) {
  if (status === "done") return <CheckCircle2 className="size-4 text-green" />;
  if (status === "error") return <AlertCircle className="size-4 text-red" />;
  if (status === "uploading" || status === "extracting" || status === "committing")
    return <Loader2 className="size-4 text-orange animate-spin" />;
  return <FileText className="size-4 text-text-3" />;
}

function labelFor(s: SdsStatus): string {
  return {
    uploading: "Laster opp…",
    extracting: "AI ekstraherer…",
    ready: "Klar for import",
    committing: "Importerer…",
    done: "Importert",
    error: "Feil",
  }[s];
}

