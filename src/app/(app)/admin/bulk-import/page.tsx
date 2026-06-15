import { BulkImportClient } from "./bulk-import-client";

export default function BulkImportPage() {
  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Bulk-import</h1>
        <p className="text-text-2 text-sm">
          Importer kunder, prosjekter eller brukere fra CSV. Last ned malen,
          fyll ut i Excel, eksporter som CSV, og lim inn eller last opp her.
        </p>
      </header>
      <BulkImportClient />
    </div>
  );
}
