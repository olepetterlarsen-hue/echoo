import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { DOCUMENT_KIND_LABELS, type DocumentKind } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";
import { ReviewActions } from "./review-actions";

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function DokumentstyringPage({ searchParams }: PageProps) {
  const { filter } = await searchParams;
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);
  const { locale } = await getServerT();

  let query = supabase
    .from("documents")
    .select(
      "*, submitted_by:profiles!documents_submitted_for_review_by_fkey(full_name), approved_by_profile:profiles!documents_approved_by_fkey(full_name), project:projects(id, project_number, title)",
    )
    .eq("organization_id", orgId)
    .order("submitted_for_review_at", { ascending: false });

  if (filter === "approved") {
    query = query.eq("status", "approved");
  } else if (filter === "rejected") {
    query = query.eq("status", "rejected");
  } else {
    query = query.eq("status", "under_review");
  }

  const { data: docsRaw } = await query;
  const docs = docsRaw as unknown as Array<{
    id: string;
    kind: string;
    version: number;
    status: string;
    change_summary: string | null;
    rejection_reason: string | null;
    approval_notes: string | null;
    submitted_by: { full_name: string | null } | null;
    project: { id: string; project_number: string; title: string } | null;
  }> | null;

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Dokumentstyring</h1>
        <p className="text-text-2 text-sm">
          Godkjenningskø for skjemaer og dokumenter (ISO 9001 7.5).
        </p>
      </header>

      <div className="flex gap-2">
        <Pill href="/iso/dokumentstyring" active={!filter}>
          Til gjennomgang
        </Pill>
        <Pill href="/iso/dokumentstyring?filter=approved" active={filter === "approved"}>
          Godkjent
        </Pill>
        <Pill href="/iso/dokumentstyring?filter=rejected" active={filter === "rejected"}>
          Avvist
        </Pill>
      </div>

      <Card>
        <CardBody className="!p-0">
          {docs && docs.length > 0 ? (
            <ul className="divide-y divide-border">
              {docs.map((d) => (
                <li key={d.id} className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    <div className="size-8 rounded-md bg-orange/15 text-orange grid place-items-center shrink-0">
                      <ClipboardList className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-1 truncate">
                        {DOCUMENT_KIND_LABELS[d.kind as DocumentKind]?.[locale] ?? d.kind}{" "}
                        v{d.version}
                      </div>
                      <div className="text-xs text-text-3 truncate">
                        {d.project ? (
                          <>
                            <Link
                              href={`/prosjekter/${d.project.id}`}
                              className="hover:text-orange"
                            >
                              {d.project.project_number} · {d.project.title}
                            </Link>
                          </>
                        ) : (
                          "Frittstående"
                        )}
                        {d.submitted_by?.full_name &&
                          ` · Sendt av ${d.submitted_by.full_name}`}
                      </div>
                      {d.change_summary && (
                        <p className="text-sm text-text-2 mt-2">
                          <span className="text-text-3">Endring: </span>
                          {d.change_summary}
                        </p>
                      )}
                      {d.rejection_reason && (
                        <p className="text-sm text-red mt-2">
                          <span className="text-text-3">Avvist: </span>
                          {d.rejection_reason}
                        </p>
                      )}
                      {d.approval_notes && (
                        <p className="text-sm text-text-2 mt-2">
                          <span className="text-text-3">Godkjent: </span>
                          {d.approval_notes}
                        </p>
                      )}
                    </div>
                    {d.status === "under_review" && (
                      <ReviewActions documentId={d.id} />
                    )}
                    {d.status === "approved" && (
                      <Badge tone="green">Godkjent</Badge>
                    )}
                    {d.status === "rejected" && (
                      <Badge tone="red">Avvist</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-text-3 text-sm">
              {filter
                ? "Ingen dokumenter i denne filteret."
                : "Ingen dokumenter venter på gjennomgang."}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Pill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm border ${
        active
          ? "bg-orange text-bg border-orange"
          : "bg-card text-text-2 border-border hover:bg-card-hover"
      }`}
    >
      {children}
    </Link>
  );
}
