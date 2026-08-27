import { loadContractForSigning } from "./actions";
import { SignForm } from "./sign-form";

export const metadata = {
  title: "Signer arbeidsavtale — Echoo",
};

export default async function SignContractPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { contract, error } = await loadContractForSigning(token);

  return (
    <div className="min-h-screen bg-surface px-4 py-10">
      <div className="max-w-2xl mx-auto">
        {!contract || error ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <h1 className="text-lg font-semibold mb-1">Kunne ikke åpne avtalen</h1>
            <p className="text-sm text-text-2">
              {error ?? "Ugyldig lenke."}
            </p>
          </div>
        ) : contract.already_signed ? (
          <div className="rounded-lg border border-green/30 bg-green/10 p-6 text-center">
            <h1 className="text-lg font-semibold mb-1 text-green">
              Avtalen er signert
            </h1>
            <p className="text-sm text-text-2">
              Takk! Arbeidsavtalen er signert av begge parter.
            </p>
          </div>
        ) : contract.expired ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <h1 className="text-lg font-semibold mb-1">Lenken er utløpt</h1>
            <p className="text-sm text-text-2">
              Be arbeidsgiver om å sende en ny signeringslenke.
            </p>
          </div>
        ) : (
          <SignForm token={token} contract={contract} />
        )}
      </div>
    </div>
  );
}
