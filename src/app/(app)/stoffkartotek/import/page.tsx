import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ImportClient } from "./import-client";

export default async function StoffkartotekImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Importer til stoffkartotek</h1>
        <p className="text-text-2 text-sm">
          Bulk-import — lim inn en CSV/TSV-liste, eller last opp flere
          SDS-PDFer som AI ekstraherer feltene fra.
        </p>
      </header>
      <ImportClient />
    </div>
  );
}
