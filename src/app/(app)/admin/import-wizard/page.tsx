import { ImportWizard } from "./wizard";

export default async function ImportWizardPage() {
  return (
    <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">AI-import</h1>
        <p className="text-text-2 text-sm">
          Last opp dine eksisterende dokumenter (PDF) — Claude klassifiserer
          dem, foreslår tittel og kategori, og spør hvis noe er uklart.
        </p>
      </header>
      <ImportWizard />
    </div>
  );
}
