"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Bug,
  Users,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Member {
  id: string;
  full_name: string | null;
  email: string;
  role: string | null;
  created_at: string;
  active: boolean | null;
}

interface Row {
  id: string;
  firma: string;
  org_nr: string | null;
  plan_tier: string | null;
  subscription_status: string | null;
  has_iso_addon: boolean | null;
  trial_ends_at: string | null;
  created_at: string | null;
  selskap_epost: string | null;
  selskap_telefon: string | null;
  locked_at: string | null;
  salesperson: string | null;
  members: Member[];
  open_issues: number;
}

const STATUSES = [
  { val: "alle", label: "Alle" },
  { val: "active", label: "Aktive" },
  { val: "trialing", label: "Trial" },
  { val: "past_due", label: "Forfalt" },
  { val: "canceled", label: "Kansellert" },
];

export function KunderClient({
  rows,
  initialFocus,
  initialStatus,
}: {
  rows: Row[];
  initialFocus?: string;
  initialStatus?: string;
}) {
  const [status, setStatus] = useState<string>(initialStatus ?? "alle");
  const [expanded, setExpanded] = useState<string | null>(initialFocus ?? null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "alle" && r.subscription_status !== status) return false;
      if (q) {
        const hay =
          `${r.firma} ${r.org_nr ?? ""} ${r.selskap_epost ?? ""} ${r.members.map((m) => `${m.full_name ?? ""} ${m.email}`).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, status, query]);

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.val}
                onClick={() => setStatus(s.val)}
                className={`px-3 py-1.5 rounded-md text-sm border ${
                  status === s.val
                    ? "bg-orange text-bg border-orange"
                    : "bg-card text-text-2 border-border hover:bg-card-hover"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk bedrift, e-post, bruker..."
            className="h-9 px-3 rounded-md text-sm bg-surface border border-border focus:border-orange focus:outline-none w-64"
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="!p-0 overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-text-3 text-sm">
              Ingen kunder matcher.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-card-hover text-text-3 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5 w-8"></th>
                  <th className="text-left px-4 py-2.5">Bedrift</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">Plan</th>
                  <th className="text-center px-4 py-2.5">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" /> Brukere
                    </span>
                  </th>
                  <th className="text-center px-4 py-2.5">
                    <span className="inline-flex items-center gap-1">
                      <Bug className="size-3" /> Åpne
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5">Selger</th>
                  <th className="text-left px-4 py-2.5">Trial-utløp</th>
                  <th className="text-left px-4 py-2.5">Signup</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o) => {
                  const isOpen = expanded === o.id;
                  return (
                    <KunderRow
                      key={o.id}
                      row={o}
                      isOpen={isOpen}
                      onToggle={() =>
                        setExpanded((cur) => (cur === o.id ? null : o.id))
                      }
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function KunderRow({
  row,
  isOpen,
  onToggle,
}: {
  row: Row;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`cursor-pointer ${isOpen ? "bg-orange/5" : "hover:bg-card-hover"}`}
        onClick={onToggle}
      >
        <td className="px-2 py-3 text-text-3">
          {isOpen ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-text-1">{row.firma}</div>
          <div className="text-xs text-text-3 mt-0.5">
            {row.org_nr && `${row.org_nr} · `}
            {row.selskap_epost ?? "—"}
          </div>
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={row.subscription_status} />
        </td>
        <td className="px-4 py-3 text-text-2 text-xs">
          {row.plan_tier === "elektro_hms"
            ? row.has_iso_addon
              ? "Elektro+HMS + ISO"
              : "Elektro+HMS"
            : "Trial"}
        </td>
        <td className="px-4 py-3 text-center">
          <span
            className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-medium ${
              row.members.length > 1
                ? "bg-orange/15 text-orange"
                : "bg-card text-text-2"
            }`}
          >
            {row.members.length}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          {row.open_issues > 0 ? (
            <Link
              href={`/team/issues?focus=${row.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-medium bg-red/15 text-red hover:bg-red/25"
            >
              {row.open_issues}
            </Link>
          ) : (
            <span className="text-text-3 text-xs">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-text-2 text-xs">
          {row.salesperson ?? (
            <span className="text-text-3 italic">Ikke tilegnet</span>
          )}
        </td>
        <td className="px-4 py-3 text-text-2 text-xs">
          {row.trial_ends_at
            ? new Date(row.trial_ends_at).toLocaleDateString("nb-NO")
            : "—"}
        </td>
        <td className="px-4 py-3 text-text-2 text-xs">
          {row.created_at &&
            new Date(row.created_at).toLocaleDateString("nb-NO")}
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={9} className="px-4 py-4 bg-bg/40">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Link
                  href={`/team/issues?focus=${row.id}`}
                  className="px-3 py-1.5 bg-card border border-border rounded text-text-2 hover:bg-card-hover inline-flex items-center gap-1.5"
                >
                  <Bug className="size-3" /> Feilrapporter ({row.open_issues}{" "}
                  åpne)
                </Link>
                {row.selskap_telefon && (
                  <a
                    href={`tel:${row.selskap_telefon}`}
                    className="px-3 py-1.5 bg-card border border-border rounded text-text-2 hover:bg-card-hover"
                  >
                    📞 {row.selskap_telefon}
                  </a>
                )}
                {row.selskap_epost && (
                  <a
                    href={`mailto:${row.selskap_epost}`}
                    className="px-3 py-1.5 bg-card border border-border rounded text-text-2 hover:bg-card-hover"
                  >
                    ✉ {row.selskap_epost}
                  </a>
                )}
              </div>

              <div>
                <div className="text-xs text-text-3 uppercase tracking-wider mb-2">
                  Brukere ({row.members.length})
                </div>
                {row.members.length === 0 ? (
                  <div className="text-sm text-text-3">
                    Ingen profiler i denne organisasjonen.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {row.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 p-2.5 rounded bg-card border border-border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-text-1 truncate flex items-center gap-2">
                            {m.full_name ?? "—"}
                            {m.active === false && (
                              <Badge tone="neutral">Deaktivert</Badge>
                            )}
                          </div>
                          <div className="text-xs text-text-3 truncate">
                            {m.email}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-orange font-medium uppercase tracking-wider">
                            {m.role ?? "—"}
                          </div>
                          <div className="text-[10px] text-text-3">
                            {new Date(m.created_at).toLocaleDateString("nb-NO")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge tone="neutral">—</Badge>;
  const map: Record<
    string,
    { label: string; tone: "green" | "yellow" | "orange" | "red" | "neutral" }
  > = {
    active: { label: "Aktiv", tone: "green" },
    trialing: { label: "Trial", tone: "orange" },
    past_due: { label: "Forfalt", tone: "yellow" },
    canceled: { label: "Kansellert", tone: "red" },
    incomplete: { label: "Ufullstendig", tone: "yellow" },
    unpaid: { label: "Ubetalt", tone: "red" },
  };
  const m = map[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
