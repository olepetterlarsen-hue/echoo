"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import type { DocumentKind } from "@/lib/types/database";
import { toggleTemplateHidden } from "./[kind]/actions";

export function TemplateRowActions({
  kind,
  isHidden,
}: {
  kind: DocumentKind;
  isHidden: boolean;
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await toggleTemplateHidden({ kind, hidden: !isHidden });
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      disabled={pending}
      title={
        isHidden ? tr("adm_tpl_row_show", locale) : tr("adm_tpl_row_hide", locale)
      }
    >
      {isHidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </Button>
  );
}
