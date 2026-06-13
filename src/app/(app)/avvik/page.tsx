import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SEVERITY_LABELS,
  DEVIATION_STATUS_LABELS,
} from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AvvikPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const { t, locale } = await getServerT();
  let query = supabase
    .from("deviations")
    .select(
      "*, project:projects(id, project_number, title), reported_by_profile:profiles!deviations_reported_by_fkey(full_name), assigned_to_profile:profiles!deviations_assigned_to_fkey(full_name)",
    )
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status as never);
  } else if (!status) {
    query = query.neq("status", "lukket");
  }

  const { data: deviations } = await query;

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("dev_page_title")}</h1>
          <p className="text-text-2 text-sm">{t("dev_page_subtitle")}</p>
        </div>
        <Link
          href="/avvik/ny"
          className="inline-flex items-center gap-1.5 rounded-md bg-orange text-bg px-3 py-2 text-sm font-medium hover:bg-orange/90"
        >
          + Nytt avvik
        </Link>
      </header>

      <div className="flex gap-2">
        <FilterLink current={status} value={undefined}>
          {t("dev_filter_open")}
        </FilterLink>
        <FilterLink current={status} value="apen">
          {t("dev_filter_fully_open")}
        </FilterLink>
        <FilterLink current={status} value="under_arbeid">
          {t("dev_filter_in_progress")}
        </FilterLink>
        <FilterLink current={status} value="lukket">
          {t("dev_filter_closed")}
        </FilterLink>
        <FilterLink current={status} value="all">
          {t("dev_filter_all")}
        </FilterLink>
      </div>

      <Card>
        <CardBody className="!p-0">
          {deviations && deviations.length > 0 ? (
            <ul className="divide-y divide-border">
              {deviations.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/avvik/${d.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-card-hover"
                  >
                    <Badge
                      tone={
                        d.severity === "kritisk"
                          ? "red"
                          : d.severity === "hoey"
                          ? "orange"
                          : d.severity === "middels"
                          ? "yellow"
                          : "neutral"
                      }
                    >
                      {SEVERITY_LABELS[d.severity][locale]}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-1 truncate">
                        {d.title}
                      </div>
                      <div className="text-xs text-text-3 truncate">
                        {d.project && (
                          <>
                            <span className="font-mono">
                              {d.project.project_number}
                            </span>{" "}
                            · {d.project.title}
                          </>
                        )}
                      </div>
                    </div>
                    <Badge
                      tone={
                        d.status === "apen"
                          ? "red"
                          : d.status === "under_arbeid"
                          ? "yellow"
                          : "green"
                      }
                    >
                      {DEVIATION_STATUS_LABELS[d.status][locale]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-text-3 text-sm">
              {status ? t("dev_empty_in_filter") : t("dev_empty_open")}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function FilterLink({
  current,
  value,
  children,
}: {
  current: string | undefined;
  value: string | undefined;
  children: React.ReactNode;
}) {
  const active =
    (current === undefined && value === undefined) ||
    current === value;
  const href = value ? `/avvik?status=${value}` : "/avvik";
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm border ${active ? "bg-orange text-bg border-orange" : "bg-card text-text-2 border-border hover:bg-card-hover"}`}
    >
      {children}
    </Link>
  );
}
