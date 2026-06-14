"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  Phone,
  CreditCard,
  Mail,
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  hms_card_number: string | null;
  phone: string | null;
  email: string;
}

interface RequiredCourse {
  id: string;
  name: string;
  category: string | null;
  validity_months: number | null;
  order_index: number;
}

interface Certificate {
  id: string;
  profile_id: string;
  required_course_id: string | null;
  name: string;
  issued_date: string | null;
  expires_date: string | null;
}

type CellStatus = "ok" | "expiring" | "urgent" | "expired" | "missing";

interface CellInfo {
  status: CellStatus;
  cert: Certificate | null;
  daysToExpiry: number | null;
}

interface Props {
  profiles: Profile[];
  courses: RequiredCourse[];
  certificates: Certificate[];
}

export function CourseMatrix({ profiles, courses, certificates }: Props) {
  const [hoverCell, setHoverCell] = useState<string | null>(null);

  const matrix = useMemo(() => {
    const map = new Map<string, CellInfo>();
    for (const p of profiles) {
      for (const c of courses) {
        const key = `${p.id}:${c.id}`;
        // Finn best matchende sertifikat: foretrekk eksplisitt link, ellers
        // første treff på samme navn (case-insensitive substring).
        const matching = certificates.filter((cert) => {
          if (cert.profile_id !== p.id) return false;
          if (cert.required_course_id === c.id) return true;
          if (cert.required_course_id) return false; // koblet til annet
          return cert.name.toLowerCase().includes(c.name.toLowerCase().slice(0, 8));
        });
        // Sorter på nyeste utløp først for å vise det mest "aktuelle"
        matching.sort((a, b) => {
          const ax = a.expires_date ?? "9999";
          const bx = b.expires_date ?? "9999";
          return bx.localeCompare(ax);
        });
        const cert = matching[0] ?? null;
        map.set(key, computeStatus(cert));
      }
    }
    return map;
  }, [profiles, courses, certificates]);

  const stats = useMemo(() => {
    const counts = { ok: 0, expiring: 0, urgent: 0, expired: 0, missing: 0 };
    for (const info of matrix.values()) {
      counts[info.status]++;
    }
    return counts;
  }, [matrix]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <Legend
          color="bg-green/15 text-green border-green/30"
          icon={<CheckCircle2 className="size-3.5" />}
          label={`Gyldig (${stats.ok})`}
        />
        <Legend
          color="bg-yellow/15 text-yellow border-yellow/40"
          icon={<Clock className="size-3.5" />}
          label={`Utløper 30-60d (${stats.expiring})`}
        />
        <Legend
          color="bg-orange/15 text-orange border-orange/40"
          icon={<AlertCircle className="size-3.5" />}
          label={`Utløper < 30d (${stats.urgent})`}
        />
        <Legend
          color="bg-red/15 text-red border-red/40"
          icon={<AlertCircle className="size-3.5" />}
          label={`Utløpt (${stats.expired})`}
        />
        <Legend
          color="bg-card-hover text-text-3 border-border"
          icon={<Circle className="size-3.5" />}
          label={`Mangler (${stats.missing})`}
        />
      </div>

      <Card>
        <CardBody className="!p-0 overflow-x-auto">
          <table className="text-sm border-collapse w-full">
            <thead className="bg-card-hover text-text-3">
              <tr>
                <th className="text-left px-4 py-2.5 sticky left-0 bg-card-hover z-10 min-w-[200px]">
                  Ansatt
                </th>
                {courses.map((c) => (
                  <th
                    key={c.id}
                    className="text-center px-2 py-2.5 font-medium text-xs"
                    title={
                      c.category
                        ? `${c.category}${c.validity_months ? ` · ${c.validity_months} mnd` : ""}`
                        : undefined
                    }
                  >
                    <div className="rotate-180 [writing-mode:vertical-rl] py-1 min-h-[120px] max-h-[140px] flex items-center">
                      {c.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-card-hover">
                  <td className="px-4 py-2 sticky left-0 bg-surface group-hover:bg-card-hover z-10">
                    <div className="font-medium text-text-1 text-sm">
                      {p.full_name ?? p.email.split("@")[0]}
                    </div>
                    <div className="text-[11px] text-text-3 flex flex-wrap gap-x-2 mt-0.5">
                      <span className="capitalize">{p.role}</span>
                      {p.hms_card_number && (
                        <span className="inline-flex items-center gap-0.5">
                          <CreditCard className="size-2.5" />
                          {p.hms_card_number}
                        </span>
                      )}
                      {p.phone && (
                        <span className="inline-flex items-center gap-0.5">
                          <Phone className="size-2.5" />
                          {p.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  {courses.map((c) => {
                    const key = `${p.id}:${c.id}`;
                    const info = matrix.get(key)!;
                    return (
                      <td
                        key={c.id}
                        className="text-center px-1 py-1 relative"
                        onMouseEnter={() => setHoverCell(key)}
                        onMouseLeave={() => setHoverCell(null)}
                      >
                        <StatusCell info={info} />
                        {hoverCell === key && info.cert && (
                          <CellPopover info={info} courseName={c.name} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <p className="text-xs text-text-3 text-center">
        Mangler ansatte i listen? Inviter dem under{" "}
        <Link href="/admin/brukere" className="text-orange hover:underline">
          /admin/brukere
        </Link>
        . HMS-kort og telefon legges inn på samme sted.
      </p>
    </div>
  );
}

function computeStatus(cert: Certificate | null): CellInfo {
  if (!cert) return { status: "missing", cert: null, daysToExpiry: null };
  if (!cert.expires_date) {
    return { status: "ok", cert, daysToExpiry: null };
  }
  const expiry = new Date(cert.expires_date).getTime();
  const now = Date.now();
  const days = Math.floor((expiry - now) / 86400000);
  let status: CellStatus;
  if (days < 0) status = "expired";
  else if (days < 30) status = "urgent";
  else if (days < 60) status = "expiring";
  else status = "ok";
  return { status, cert, daysToExpiry: days };
}

function StatusCell({ info }: { info: CellInfo }) {
  const map = {
    ok: { classes: "bg-green/15 text-green border-green/30", icon: CheckCircle2 },
    expiring: { classes: "bg-yellow/15 text-yellow border-yellow/40", icon: Clock },
    urgent: { classes: "bg-orange/15 text-orange border-orange/40", icon: AlertCircle },
    expired: { classes: "bg-red/15 text-red border-red/40", icon: AlertCircle },
    missing: { classes: "bg-card-hover text-text-3 border-border opacity-60", icon: Circle },
  } as const;
  const m = map[info.status];
  const Icon = m.icon;
  return (
    <div
      className={`inline-flex items-center justify-center size-9 rounded-md border ${m.classes}`}
    >
      <Icon className="size-4" />
    </div>
  );
}

function CellPopover({
  info,
  courseName,
}: {
  info: CellInfo;
  courseName: string;
}) {
  if (!info.cert) return null;
  return (
    <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 bg-surface border border-border rounded-md shadow-xl px-3 py-2 text-left text-xs w-56 pointer-events-none">
      <div className="font-medium text-text-1 mb-1">{courseName}</div>
      <div className="text-text-3 mb-1">{info.cert.name}</div>
      {info.cert.issued_date && (
        <div className="text-text-2">
          Utstedt: {new Date(info.cert.issued_date).toLocaleDateString("nb-NO")}
        </div>
      )}
      {info.cert.expires_date && (
        <div className="text-text-2">
          Utløper: {new Date(info.cert.expires_date).toLocaleDateString("nb-NO")}
          {info.daysToExpiry !== null && (
            <span className="ml-1 text-text-3">
              ({info.daysToExpiry < 0
                ? `${Math.abs(info.daysToExpiry)} dager siden`
                : `om ${info.daysToExpiry} dager`})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Legend({
  color,
  icon,
  label,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 ${color}`}
    >
      {icon}
      {label}
    </span>
  );
}
