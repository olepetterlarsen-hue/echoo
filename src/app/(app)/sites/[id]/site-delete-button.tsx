"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { deleteSite } from "../actions";

export function SiteDeleteButton({
  siteId,
  siteName,
}: {
  siteId: string;
  siteName: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm(tr("site_delete_confirm", locale).replace("{name}", siteName)))
      return;
    startTransition(async () => {
      const res = await deleteSite({ id: siteId });
      if (!res.error) router.push("/sites");
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={onDelete} disabled={pending}>
      <Trash2 className="size-4" />
      {tr("delete", locale)}
    </Button>
  );
}
