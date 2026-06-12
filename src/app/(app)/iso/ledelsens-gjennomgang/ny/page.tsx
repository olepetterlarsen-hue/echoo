import { MgmtReviewForm } from "./mgmt-review-form";

export default async function NyMgmtReviewPage() {
  return (
    <div className="px-6 py-6 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Ny ledelsens gjennomgang</h1>
        <p className="text-text-2 text-sm">
          Et snapshot av åpne avvik, revisjonsfunn og KPI-status hentes
          automatisk når gjennomgangen opprettes.
        </p>
      </header>
      <MgmtReviewForm />
    </div>
  );
}
