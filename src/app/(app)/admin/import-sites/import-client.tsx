"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { parseSitesCsv, type RawSiteRow } from "@/lib/import/csv-parser";
import { importSites } from "./actions";

type ImportResult = {
  customers_created: number;
  customers_matched: number;
  sites_created: number;
  sites_skipped: number;
  errors: string[];
};

export function ImportSitesClient() {
  const { locale } = useLocale();
  const router = useRouter();
  const [preview, setPreview] = useState<RawSiteRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const rows = parseSitesCsv(text);
        if (rows.length === 0) {
          setError(tr("adm_imp_err_no_rows", locale));
          setPreview(null);
        } else {
          setPreview(rows);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    };
    reader.onerror = () => setError(tr("adm_imp_err_read_file", locale));
    reader.readAsText(file, "utf-8");
  }

  function onImport() {
    if (!preview) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await importSites({ rows: preview });
      if (res.error) {
        setError(res.error);
      } else if (res.result) {
        setResult(res.result);
        router.refresh();
      }
    });
  }

  // Gruppér forhåndsvisning etter kunde
  const byCustomer = new Map<string, RawSiteRow[]>();
  if (preview) {
    for (const r of preview) {
      const list = byCustomer.get(r.customerName) ?? [];
      list.push(r);
      byCustomer.set(r.customerName, list);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tr("adm_imp_step1_title", locale)}</CardTitle>
        </CardHeader>
        <CardBody>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="block w-full text-sm text-text-2 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-orange file:text-bg file:cursor-pointer"
          />
          {fileName && (
            <p className="text-xs text-text-3 mt-2">
              {tr("adm_imp_selected", locale).replace("{name}", fileName)}
            </p>
          )}
        </CardBody>
      </Card>

      {error && (
        <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2 flex items-start gap-2">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <Card className="border-green/30 bg-green/5">
          <CardBody className="flex items-start gap-3">
            <CheckCircle2 className="size-5 text-green mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-text-1">
                {tr("adm_imp_done_title", locale)}
              </p>
              <p className="text-text-2">
                {tr("adm_imp_done_customers", locale)
                  .replace("{created}", String(result.customers_created))
                  .replace("{matched}", String(result.customers_matched))}
              </p>
              <p className="text-text-2">
                {tr("adm_imp_done_sites", locale)
                  .replace("{created}", String(result.sites_created))
                  .replace("{skipped}", String(result.sites_skipped))}
              </p>
              {result.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-yellow text-xs cursor-pointer">
                    {tr("adm_imp_warnings", locale).replace(
                      "{n}",
                      String(result.errors.length),
                    )}
                  </summary>
                  <ul className="text-xs text-yellow mt-1 ml-3 list-disc">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="flex gap-3 mt-2">
                <a href="/kunder" className="text-orange hover:underline text-sm">
                  {tr("adm_imp_see_customers", locale)}
                </a>
                <a href="/sites" className="text-orange hover:underline text-sm">
                  {tr("adm_imp_see_sites", locale)}
                </a>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {preview && !result && (
        <Card>
          <CardHeader>
            <CardTitle>
              {tr("adm_imp_step2_title", locale)
                .replace("{sites}", String(preview.length))
                .replace("{customers}", String(byCustomer.size))}
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-text-2">
              {tr("adm_imp_preview_note", locale)}
            </p>

            <div className="space-y-3">
              {[...byCustomer.entries()].map(([customer, sites]) => (
                <details key={customer} className="border border-border rounded-md">
                  <summary className="px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-card-hover">
                    <span className="font-medium">{customer}</span>
                    <Badge tone="orange">
                      {tr("adm_imp_n_sites", locale).replace(
                        "{n}",
                        String(sites.length),
                      )}
                    </Badge>
                  </summary>
                  <div className="px-3 pb-2">
                    <table className="w-full text-xs">
                      <thead className="text-text-3 text-[10px] uppercase">
                        <tr>
                          <th className="text-left py-1">
                            {tr("adm_imp_col_site_id", locale)}
                          </th>
                          <th className="text-left py-1">
                            {tr("adm_imp_col_name", locale)}
                          </th>
                          <th className="text-left py-1">
                            {tr("adm_imp_col_address", locale)}
                          </th>
                          <th className="text-left py-1">
                            {tr("adm_imp_col_city", locale)}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sites.map((s, i) => (
                          <tr key={i}>
                            <td className="py-1 font-mono">
                              {s.externalSiteId ?? "—"}
                            </td>
                            <td className="py-1">{s.siteName}</td>
                            <td className="py-1 text-text-2">{s.address}</td>
                            <td className="py-1 text-text-3">
                              {[s.postal_code, s.city].filter(Boolean).join(" ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setPreview(null);
                  setFileName(null);
                }}
                disabled={pending}
              >
                {tr("adm_imp_clear", locale)}
              </Button>
              <Button onClick={onImport} disabled={pending}>
                <Upload className="size-4" />
                {pending
                  ? tr("adm_imp_importing", locale)
                  : tr("adm_imp_import_n", locale).replace(
                      "{n}",
                      String(preview.length),
                    )}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
