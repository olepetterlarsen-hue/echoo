"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assignSalesperson } from "./actions";

interface OrgRow {
  id: string;
  firma: string;
  created_at: string | null;
  trial_ends_at: string | null;
  subscription_status: string | null;
}

interface Salesperson {
  id: string;
  full_name: string | null;
  email: string;
}

interface Assignment {
  organization_id: string;
  salesperson_id: string;
  notes: string | null;
}

export function SalgClient({
  orgs,
  assignmentMap,
  staff,
}: {
  orgs: OrgRow[];
  assignmentMap: Map<string, Assignment>;
  staff: Salesperson[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unassigned" | "active">("all");

  function assign(orgId: string, salesperson_id: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await assignSalesperson({
        organization_id: orgId,
        salesperson_id,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  const visible = orgs.filter((o) => {
    if (filter === "unassigned") return !assignmentMap.has(o.id);
    if (filter === "active")
      return (
        o.subscription_status === "active" ||
        o.subscription_status === "trialing"
      );
    return true;
  });

  return (
    <Card>
      <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-text-1">Tildeling av selger</h3>
          <p className="text-xs text-text-3 mt-0.5">
            Velg selger per kunde. Tomt = ikke tilegnet.
          </p>
        </div>
        <div className="flex gap-1">
          {(["all", "active", "unassigned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs ${
                filter === f
                  ? "bg-orange text-bg"
                  : "bg-card text-text-2 hover:bg-card-hover border border-border"
              }`}
            >
              {f === "all"
                ? "Alle"
                : f === "active"
                  ? "Aktive/trial"
                  : "Ikke tilegnet"}
            </button>
          ))}
        </div>
      </div>
      <CardBody className="!p-0">
        {error && (
          <div className="px-5 py-2 text-sm text-red bg-red/10 border-b border-border">
            {error}
          </div>
        )}
        {visible.length === 0 ? (
          <div className="p-6 text-center text-text-3 text-sm">
            Ingen kunder i dette filteret.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((o) => {
              const a = assignmentMap.get(o.id);
              return (
                <li
                  key={o.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-card-hover"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-1 truncate">
                      {o.firma}
                    </div>
                    <div className="text-xs text-text-3">
                      Signup{" "}
                      {o.created_at &&
                        new Date(o.created_at).toLocaleDateString("nb-NO")}{" "}
                      ·{" "}
                      <StatusInline status={o.subscription_status} />
                    </div>
                  </div>
                  <select
                    value={a?.salesperson_id ?? ""}
                    onChange={(e) => assign(o.id, e.target.value || null)}
                    disabled={pending}
                    className="bg-card border border-border rounded-md px-2 py-1.5 text-sm min-w-[180px]"
                  >
                    <option value="">— Ikke tilegnet —</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name ?? s.email}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function StatusInline({ status }: { status: string | null }) {
  if (!status) return <span className="text-text-3">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Aktiv", cls: "text-green" },
    trialing: { label: "Trial", cls: "text-orange" },
    past_due: { label: "Forfalt", cls: "text-yellow" },
    canceled: { label: "Kansellert", cls: "text-red" },
  };
  const m = map[status] ?? { label: status, cls: "text-text-3" };
  return <span className={m.cls}>{m.label}</span>;
}

void Badge;
