"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { updateIssueReport } from "@/app/(app)/actions/issue-reports";

type Severity = "lav" | "middels" | "hoey";
type Status = "apen" | "under_arbeid" | "lukket";

interface IssueRow {
  id: string;
  title: string;
  description: string | null;
  severity: Severity;
  status: Status;
  page_url: string | null;
  user_agent: string | null;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  reported_by: string | null;
  profiles: { full_name: string | null; email: string } | null;
}

interface Props {
  issues: IssueRow[];
  locale: Locale;
}

export function IssuesClient({ issues, locale }: Props) {
  const [statusFilter, setStatusFilter] = useState<"alle" | Status>("alle");
  const [sevFilter, setSevFilter] = useState<"alle" | Severity>("alle");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      issues.filter(
        (r) =>
          (statusFilter === "alle" || r.status === statusFilter) &&
          (sevFilter === "alle" || r.severity === sevFilter),
      ),
    [issues, statusFilter, sevFilter],
  );

  function downloadCsv() {
    const headers = [
      "id",
      "created_at",
      "title",
      "description",
      "severity",
      "status",
      "page_url",
      "reporter_name",
      "reporter_email",
      "user_agent",
      "admin_notes",
      "resolved_at",
    ];
    const rows = filtered.map((r) => [
      r.id,
      r.created_at,
      r.title,
      r.description ?? "",
      r.severity,
      r.status,
      r.page_url ?? "",
      r.profiles?.full_name ?? "",
      r.profiles?.email ?? "",
      r.user_agent ?? "",
      r.admin_notes ?? "",
      r.resolved_at ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell).replace(/"/g, '""');
            return /[",\n;]/.test(s) ? `"${s}"` : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `issues-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statusOptions: Array<{ val: "alle" | Status; key: string }> = [
    { val: "alle", key: "adm_iss_filter_all" },
    { val: "apen", key: "adm_iss_status_apen" },
    { val: "under_arbeid", key: "adm_iss_status_under_arbeid" },
    { val: "lukket", key: "adm_iss_status_lukket" },
  ];
  const sevOptions: Array<{ val: "alle" | Severity; key: string }> = [
    { val: "alle", key: "adm_iss_filter_all" },
    { val: "lav", key: "adm_iss_sev_lav" },
    { val: "middels", key: "adm_iss_sev_middels" },
    { val: "hoey", key: "adm_iss_sev_hoey" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <label className="block text-xs text-text-3">
                {tr("adm_iss_filter_status", locale)}
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "alle" | Status)
                }
                className="h-9 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                {statusOptions.map((o) => (
                  <option key={o.val} value={o.val}>
                    {tr(o.key as Parameters<typeof tr>[0], locale)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-text-3">
                {tr("adm_iss_filter_severity", locale)}
              </label>
              <select
                value={sevFilter}
                onChange={(e) =>
                  setSevFilter(e.target.value as "alle" | Severity)
                }
                className="h-9 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                {sevOptions.map((o) => (
                  <option key={o.val} value={o.val}>
                    {tr(o.key as Parameters<typeof tr>[0], locale)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="button" onClick={downloadCsv} disabled={filtered.length === 0}>
            <Download className="size-4 mr-2" />
            {tr("adm_iss_export_csv", locale)}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="!p-0">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-text-3 text-sm">
              {tr("adm_iss_empty", locale)}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => (
                <IssueRowItem
                  key={r.id}
                  row={r}
                  locale={locale}
                  expanded={expanded === r.id}
                  onToggle={() =>
                    setExpanded((cur) => (cur === r.id ? null : r.id))
                  }
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function IssueRowItem({
  row,
  locale,
  expanded,
  onToggle,
}: {
  row: IssueRow;
  locale: Locale;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [status, setStatus] = useState<Status>(row.status);
  const [notes, setNotes] = useState(row.admin_notes ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      const res = await updateIssueReport({
        id: row.id,
        status,
        admin_notes: notes,
      });
      if (!res?.error) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      }
    });
  }

  const sevTone =
    row.severity === "hoey" ? "red" : row.severity === "middels" ? "yellow" : "neutral";
  const statTone =
    row.status === "apen"
      ? "orange"
      : row.status === "under_arbeid"
        ? "yellow"
        : "green";
  const sevKey = ("adm_iss_sev_" + row.severity) as Parameters<typeof tr>[0];
  const statKey = ("adm_iss_status_" + row.status) as Parameters<typeof tr>[0];

  const created = new Date(row.created_at).toLocaleString(
    locale === "no" ? "no-NO" : "en-GB",
    { dateStyle: "short", timeStyle: "short" },
  );

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-card-hover text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-1 truncate">{row.title}</span>
            <Badge tone={sevTone}>{tr(sevKey, locale)}</Badge>
            <Badge tone={statTone}>{tr(statKey, locale)}</Badge>
          </div>
          <div className="text-xs text-text-3 mt-0.5 truncate">
            {row.profiles?.full_name || row.profiles?.email || "—"} ·{" "}
            {created} · {row.page_url}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-text-3" />
        ) : (
          <ChevronDown className="size-4 text-text-3" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-border bg-bg/40">
          {row.description && (
            <div>
              <div className="text-xs text-text-3 mb-1">
                {tr("adm_iss_description", locale)}
              </div>
              <pre className="whitespace-pre-wrap text-sm text-text-1 font-sans bg-card border border-border rounded p-3">
                {row.description}
              </pre>
            </div>
          )}
          {row.user_agent && (
            <div>
              <div className="text-xs text-text-3 mb-1">
                {tr("adm_iss_user_agent", locale)}
              </div>
              <div className="text-xs text-text-2 font-mono break-all">
                {row.user_agent}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs text-text-3">
                {tr("adm_iss_set_status", locale)}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="w-full h-9 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="apen">{tr("adm_iss_status_apen", locale)}</option>
                <option value="under_arbeid">
                  {tr("adm_iss_status_under_arbeid", locale)}
                </option>
                <option value="lukket">{tr("adm_iss_status_lukket", locale)}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-text-3">
                {tr("adm_iss_admin_notes", locale)}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md px-3 py-2 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" onClick={save} disabled={pending}>
              {tr("adm_iss_save_notes", locale)}
            </Button>
            {saved && (
              <span className="text-sm text-green">{tr("adm_iss_saved", locale)}</span>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
