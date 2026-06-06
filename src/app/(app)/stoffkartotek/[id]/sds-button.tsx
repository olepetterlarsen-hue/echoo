"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { getSdsSignedUrl } from "../actions";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

export function SdsDownloadButton({ path }: { path: string }) {
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await getSdsSignedUrl({ path });
      if (res.url) {
        window.open(res.url, "_blank");
      } else {
        alert(
          tr("subs_sds_button_err", locale).replace(
            "{msg}",
            res.error ?? tr("subs_sds_unknown_err", locale),
          ),
        );
      }
    });
  }

  return (
    <Button onClick={onClick} disabled={pending} size="sm">
      <FileDown className="size-4" />
      {pending
        ? tr("subs_sds_button_opening", locale)
        : tr("subs_sds_button_open", locale)}
    </Button>
  );
}
