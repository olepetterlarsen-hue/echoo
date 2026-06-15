"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  Search,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateIssueStaff } from "./actions";

type Severity = "lav" | "middels" | "hoey";
type Status = "apen" | "under_arbeid" | "lukket";

interface Org {
  id: string;
  firma: string;
  subscription_status: string | null;
  plan_tier: string | null;
}

interface Reporter {
  id: string;
  full_name: string | null;
  email: string;
}

interface EnrichedIssue {
  id: string;
  organization_id: string | null;
  title: string;
  description: string | null;
  severity: Severity;
  status: Status;
  page_url: string | null;
  user_agent: string | null;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  org: Org | null;
  reporter: Reporter | null;
}

export function IssuesInboxClient({
  rows,
  initialOrgFilter,
}: {
  rows: EnrichedIssue[];
  initialOrgFilter?: string;
}) {
  // Når man kommer fra /team/kunder med ?focus=<org_id>, vis alle statuser
  // for den kunden (ikke bare åpne) — ellers default til "kun åpne".
  const [status, setStatus] = useState<"alle" | Status>(
    initialOrgFilter ? "alle" : "apen",
  );
  const [severity, setSeverity] = useState<"alle" | Severity>("alle");
  const [orgFilter, setOrgFilter] = useState<string>(
    initialOrgFilter ?? "alle",
  );
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Liste over kunder med rapporter — for filter-dropdown
  const orgOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.org && !map.has(r.org.id)) map.set(r.org.id, r.org.firma);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "alle" && r.status !== status) return false;
      if (severity !== "alle" && r.severity !== severity) return false;
      if (orgFilter !== "alle" && r.organization_id !== orgFilter) return false;
      if (q) {
        const hay = `${r.title} ${r.description ?? ""} ${r.org?.firma ?? ""} ${r.reporter?.full_name ?? ""} ${r.reporter?.email ?? ""} ${r.page_url ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, status, severity, orgFilter, query]);

  function downloadCsv() {
    const headers = [
      "id",
      "created_at",
      "title",
      "description",
      "severity",
      "status",
      "page_url",
      "kunde",
      "rapportert_av",
      "epost",
      "admin_notes",
      "resolved_at",
      "user_agent",
    ];
    const data = filtered.map((r) => [
      r.id,
      r.created_at,
      r.title,
      r.description ?? "",
      r.severity,
      r.status,
      r.page_url ?? "",
      r.org?.firma ?? "",
      r.reporter?.full_name ?? "",
      r.reporter?.email ?? "",
      r.admin_notes ?? "",
      r.resolved_at ?? "",
      r.user_agent ?? "",
    ]);
    const csv = [headers, ...data]
      .map((row) =>
        row
          .map((c) => {
            const s = String(c).replace(/"/g, '""');
            return /[",\n;]/.test(s) ? `"${s}"` : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `echoo-issues-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <FilterBox label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "alle" | Status)}
              className="h-9 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            >
              <option value="alle">Alle</option>
              <option value="apen">Åpen</option>
              <option value="under_arbeid">Under arbeid</option>
              <option value="lukket">Lukket</option>
            </select>
          </FilterBox>
          <FilterBox label="Alvorlighet">
            <select
              value={severity}
              onChange={(e) =>
                setSeverity(e.target.value as "alle" | Severity)
              }
              className="h-9 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            >
              <option value="alle">Alle</option>
              <option value="hoey">Høy</option>
              <option value="middels">Middels</option>
              <option value="lav">Lav</option>
            </select>
          </FilterBox>
          <FilterBox label="Kunde">
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="h-9 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none min-w-[180px]"
            >
              <option value="alle">Alle ({orgOptions.length})</option>
              {orgOptions.map(([id, firma]) => (
                <option key={id} value={id}>
                  {firma}
                </option>
              ))}
            </select>
          </FilterBox>
          <FilterBox label="Søk">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tittel, beskrivelse, kunde..."
                className="h-9 pl-8 pr-3 rounded-md text-sm bg-surface border border-border focus:border-orange focus:outline-none w-64"
              />
            </div>
          </FilterBox>
          <div className="flex-1" />
          <button
            type="button"
            onClick={downloadCsv}
            disabled={filtered.length === 0}
            className="h-9 inline-flex items-center gap-2 px-3 rounded-md bg-card border border-border text-sm text-text-2 hover:bg-card-hover disabled:opacity-40"
          >
            <Download className="size-3.5" />
            CSV ({filtered.length})
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="!p-0">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-text-3 text-sm">
              Ingen rapporter matcher filtrene.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => (
                <IssueRow
                  key={r.id}
                  row={r}
                  isOpen={expanded === r.id}
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

function FilterBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs text-text-3">{label}</label>
      {children}
    </div>
  );
}

function IssueRow({
  row,
  isOpen,
  onToggle,
}: {
  row: EnrichedIssue;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(row.status);
  const [notes, setNotes] = useState(row.admin_notes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number>(0);

  function save(nextStatus?: Status) {
    setError(null);
    const targetStatus = nextStatus ?? status;
    startTransition(async () => {
      const res = await updateIssueStaff({
        id: row.id,
        status: targetStatus,
        admin_notes: notes,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (nextStatus) setStatus(nextStatus);
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  const sevTone =
    row.severity === "hoey"
      ? "red"
      : row.severity === "middels"
        ? "yellow"
        : "neutral";
  const statTone =
    row.status === "apen"
      ? "orange"
      : row.status === "under_arbeid"
        ? "yellow"
        : "green";

  const created = new Date(row.created_at).toLocaleString("nb-NO", {
    dateStyle: "short",
    timeStyle: "short",
  });

  // Plukk pathname ut av page_url for kompakt visning
  let displayPath: string | null = null;
  if (row.page_url) {
    try {
      displayPath = new URL(row.page_url).pathname;
    } catch {
      displayPath = row.page_url;
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-5 py-3 hover:bg-card-hover text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text-1 truncate max-w-md">
              {row.title}
            </span>
            <Badge tone={sevTone}>
              {row.severity === "hoey"
                ? "Høy"
                : row.severity === "middels"
                  ? "Middels"
                  : "Lav"}
            </Badge>
            <Badge tone={statTone}>
              {row.status === "apen"
                ? "Åpen"
                : row.status === "under_arbeid"
                  ? "Under arbeid"
                  : "Lukket"}
            </Badge>
          </div>
          <div className="text-xs text-text-3 mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-orange font-medium">
              {row.org?.firma ?? "— Ingen kunde —"}
            </span>
            <span>·</span>
            <span>
              {row.reporter?.full_name || row.reporter?.email || "anonym"}
            </span>
            <span>·</span>
            <span>{created}</span>
            {displayPath && (
              <>
                <span>·</span>
                <code className="bg-card-hover px-1 rounded text-[11px] text-text-2">
                  {displayPath}
                </code>
              </>
            )}
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="size-4 text-text-3 mt-1 shrink-0" />
        ) : (
          <ChevronDown className="size-4 text-text-3 mt-1 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="px-5 pb-4 pt-1 space-y-3 border-t border-border bg-bg/40">
          {row.description && (
            <div>
              <div className="text-xs text-text-3 mb-1">Beskrivelse</div>
              <pre className="whitespace-pre-wrap text-sm text-text-1 font-sans bg-card border border-border rounded p-3">
                {row.description}
              </pre>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {row.page_url && (
              <div>
                <div className="text-text-3 mb-1">Side</div>
                <a
                  href={row.page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange hover:underline break-all inline-flex items-center gap-1"
                >
                  {row.page_url}
                  <ExternalLink className="size-3" />
                </a>
              </div>
            )}
            {row.user_agent && (
              <div>
                <div className="text-text-3 mb-1">Nettleser</div>
                <div className="text-text-2 font-mono break-all">
                  {row.user_agent}
                </div>
              </div>
            )}
          </div>

          {row.org && (
            <div className="text-xs text-text-3">
              Kunde-status:{" "}
              <span className="text-text-2">
                {row.org.subscription_status ?? "—"}
              </span>
              {row.org.plan_tier && (
                <>
                  {" "}
                  · Plan:{" "}
                  <span className="text-text-2">{row.org.plan_tier}</span>
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs text-text-3 mb-1">
              Interne notater (synlig kun for Echoo-staff)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notér årsak, vurdering, og hva som ble gjort..."
              className="w-full rounded-md px-3 py-2 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            />
          </div>

          {error && (
            <div className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => save()}
              disabled={pending}
              className="px-3 py-1.5 bg-card border border-border rounded text-sm text-text-2 hover:bg-card-hover disabled:opacity-50"
            >
              Lagre notat
            </button>
            {status !== "under_arbeid" && (
              <button
                type="button"
                onClick={() => save("under_arbeid")}
                disabled={pending}
                className="px-3 py-1.5 bg-yellow/15 text-yellow border border-yellow/40 rounded text-sm hover:bg-yellow/25 disabled:opacity-50"
              >
                Marker under arbeid
              </button>
            )}
            {status !== "lukket" && (
              <button
                type="button"
                onClick={() => save("lukket")}
                disabled={pending}
                className="px-3 py-1.5 bg-green text-bg rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                Lukk som fikset
              </button>
            )}
            {status === "lukket" && (
              <button
                type="button"
                onClick={() => save("apen")}
                disabled={pending}
                className="px-3 py-1.5 bg-card border border-border rounded text-sm text-text-2 hover:bg-card-hover disabled:opacity-50"
              >
                Åpne igjen
              </button>
            )}
            {savedAt > 0 && Date.now() - savedAt < 3000 && (
              <span className="text-sm text-green">Lagret ✓</span>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
