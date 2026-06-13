import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { NewDeviationForm } from "./new-deviation-form";

interface PageProps {
  searchParams: Promise<{ from_ai?: string }>;
}

export default async function NyAvvikPage({ searchParams }: PageProps) {
  const { from_ai } = await searchParams;
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);

  const [{ data: projects }, { data: profiles }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, project_number, title")
      .eq("organization_id", orgId)
      .eq("status", "aktiv")
      .order("project_number", { ascending: false })
      .limit(100),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("full_name"),
  ]);

  return (
    <div className="px-6 py-6 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Nytt avvik</h1>
        <p className="text-text-2 text-sm">
          {from_ai === "1"
            ? "Utkast generert av Echoo AI — gå gjennom alle felt før du lagrer."
            : "Registrer et avvik manuelt eller bruk AI-assistenten."}
        </p>
      </header>
      <NewDeviationForm
        projects={projects ?? []}
        profiles={profiles ?? []}
        fromAi={from_ai === "1"}
      />
    </div>
  );
}
