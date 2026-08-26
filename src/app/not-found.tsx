import Link from "next/link";
import { FileQuestion, ChevronLeft } from "lucide-react";

/**
 * Global 404-side — uten denne viser Next.js sin engelske standardtekst
 * ("This page could not be found."), som skiller seg fra resten av det
 * norske grensesnittet.
 */
export default function NotFound() {
  return (
    <div className="px-6 py-12 max-w-2xl mx-auto">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center size-16 rounded-full bg-orange/15 text-orange mx-auto">
          <FileQuestion className="size-8" />
        </div>
        <h1 className="text-2xl font-semibold">Siden finnes ikke</h1>
        <p className="text-text-2">
          Vi fant ingen side på denne adressen. Den kan være flyttet, slettet,
          eller lenken kan være feil.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-md bg-orange text-bg text-sm font-medium hover:bg-orange/90"
        >
          <ChevronLeft className="size-4" />
          Til forsiden
        </Link>
      </div>
    </div>
  );
}
