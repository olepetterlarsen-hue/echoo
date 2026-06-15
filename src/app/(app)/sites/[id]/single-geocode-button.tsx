"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, RefreshCw } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { geocodeSite } from "../geocode-actions";

export function SingleGeocodeButton({
  siteId,
  hasAddress,
}: {
  siteId: string;
  hasAddress: boolean;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    type: "ok" | "err";
    message: string;
  } | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      const res = await geocodeSite({ siteId });
      if (res.error) {
        setResult({ type: "err", message: res.error });
        return;
      }
      if (res.latitude != null && res.longitude != null) {
        setResult({
          type: "ok",
          message: tr("site_geocode_single_success", locale)
            .replace("{lat}", res.latitude.toFixed(6))
            .replace("{lon}", res.longitude.toFixed(6)),
        });
        router.refresh();
      }
    });
  }

  if (!hasAddress) {
    return (
      <p className="text-xs text-text-3">
        {locale === "no"
          ? "Legg inn adresse for å kunne geokode automatisk."
          : "Add an address to enable automatic geocoding."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange text-bg rounded-md text-sm font-medium hover:bg-orange/90 disabled:opacity-50"
      >
        {pending ? (
          <>
            <RefreshCw className="size-4 animate-spin" />
            {tr("site_geocode_single_running", locale)}
          </>
        ) : (
          <>
            <MapPin className="size-4" />
            {tr("site_geocode_single", locale)}
          </>
        )}
      </button>
      {result && (
        <p
          className={`text-xs ${result.type === "ok" ? "text-green" : "text-red"}`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
