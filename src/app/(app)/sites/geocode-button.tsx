"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { geocodeSite, getSitesNeedingGeocode } from "./geocode-actions";

export function GeocodeButton({
  initialMissing,
}: {
  initialMissing: number;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{
    total: number;
    done: number;
    succeeded: number;
    failed: number;
    currentName?: string;
  } | null>(null);

  function start() {
    const minutes = Math.ceil((initialMissing * 1.5) / 60);
    if (
      !confirm(
        tr("site_geocode_confirm", locale)
          .replace("{n}", String(initialMissing))
          .replace("{min}", String(minutes)),
      )
    )
      return;
    setRunning(true);
    startTransition(async () => {
      const sites = await getSitesNeedingGeocode();
      setProgress({
        total: sites.length,
        done: 0,
        succeeded: 0,
        failed: 0,
      });
      let succeeded = 0;
      let failed = 0;
      for (let i = 0; i < sites.length; i++) {
        const s = sites[i];
        setProgress({
          total: sites.length,
          done: i,
          succeeded,
          failed,
          currentName: s.name,
        });
        const res = await geocodeSite({ siteId: s.id });
        if (res.error) failed++;
        else succeeded++;
        // Nominatim policy: 1 req/sek
        await new Promise((r) => setTimeout(r, 1100));
      }
      setProgress({
        total: sites.length,
        done: sites.length,
        succeeded,
        failed,
      });
      setRunning(false);
      router.refresh();
    });
  }

  if (initialMissing === 0 && !running) return null;

  return (
    <Card className="border-orange/30 bg-orange/5">
      <CardBody className="flex items-start gap-3 flex-wrap">
        <MapPin className="size-5 text-orange mt-0.5" />
        <div className="flex-1 min-w-0">
          {!progress ? (
            <>
              <p className="font-medium text-text-1">
                {tr("site_geocode_missing_label", locale).replace(
                  "{n}",
                  String(initialMissing),
                )}
              </p>
              <p className="text-sm text-text-2">
                {tr("site_geocode_help", locale)}
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-text-1">
                {progress.done < progress.total ? (
                  <>
                    {tr("site_geocode_running", locale)}{" "}
                    <span className="text-text-2 text-sm">
                      ({progress.done}/{progress.total})
                    </span>
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-green" />
                    {tr("site_geocode_done", locale)
                      .replace("{ok}", String(progress.succeeded))
                      .replace("{failed}", String(progress.failed))}
                  </span>
                )}
              </p>
              {progress.currentName && progress.done < progress.total && (
                <p className="text-xs text-text-3 mt-1 truncate">
                  {tr("site_geocode_current", locale).replace(
                    "{name}",
                    progress.currentName,
                  )}
                </p>
              )}
              <div className="mt-2 h-2 bg-card rounded overflow-hidden">
                <div
                  className="h-full bg-orange transition-all"
                  style={{
                    width: `${(progress.done / progress.total) * 100}%`,
                  }}
                />
              </div>
              {progress.failed > 0 && progress.done === progress.total && (
                <p className="text-xs text-yellow mt-2 flex items-start gap-1">
                  <AlertCircle className="size-3 mt-0.5 shrink-0" />
                  {tr("site_geocode_failed_hint", locale).replace(
                    "{n}",
                    String(progress.failed),
                  )}
                </p>
              )}
            </>
          )}
        </div>
        {!running && initialMissing > 0 && (
          <Button onClick={start} disabled={pending}>
            <MapPin className="size-4" />
            {tr("site_geocode_now", locale)}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
