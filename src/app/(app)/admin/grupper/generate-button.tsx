"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { generateOpTeams } from "./actions";

export function GenerateOpTeamsButton() {
  const { locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function onClick() {
    if (!confirm(tr("adm_grp_gen_confirm", locale))) return;
    setResult(null);
    startTransition(async () => {
      const res = await generateOpTeams();
      if (res.error) {
        setResult(tr("adm_grp_gen_error", locale).replace("{error}", res.error));
      } else {
        setResult(
          tr("adm_grp_gen_done", locale)
            .replace("{created}", String(res.created))
            .replace("{skipped}", String(res.skipped)),
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={onClick} disabled={pending} variant="secondary" size="sm">
        <Sparkles className="size-4" />
        {pending ? tr("adm_grp_gen_running", locale) : tr("adm_grp_gen_btn", locale)}
      </Button>
      {result && <span className="text-xs text-text-2">{result}</span>}
    </div>
  );
}
