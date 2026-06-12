import Link from "next/link";
import { ImportWizard } from "../../admin/import-wizard/wizard";

export default async function OnboardingImportPage() {
  return (
    <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Importér dine eksisterende dokumenter</h1>
        <p className="text-text-2 text-sm">
          Last opp PDF-versjoner av rutiner, skjemaer, håndbok-kapitler,
          stoffkartotek-blad og kompetansebevis. AI-en klassifiserer hver
          fil og foreslår plassering — du bekrefter før noe importeres.
        </p>
      </header>
      <ImportWizard />
      <div className="text-center">
        <Link
          href="/dashboard"
          className="text-sm text-text-3 hover:text-orange underline"
        >
          Hopp over import for nå
        </Link>
      </div>
    </div>
  );
}
