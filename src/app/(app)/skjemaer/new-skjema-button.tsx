"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, Sparkles } from "lucide-react";
import { DOCUMENT_KIND_LABELS, type DocumentKind } from "@/lib/types/database";
import { createStandaloneDocument } from "./actions";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

interface CustomTemplateOption {
  id: string;
  name: string;
  ai_generated: boolean;
}

interface Props {
  builtins: DocumentKind[];
  customTemplates: CustomTemplateOption[];
}

export function NewSkjemaButton({ builtins, customTemplates }: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function create(kind: DocumentKind, customTemplateId?: string) {
    setError(null);
    setOpen(false);
    startTransition(async () => {
      const res = await createStandaloneDocument({ kind, customTemplateId });
      if (res.error) setError(res.error);
      else if (res.documentId) {
        router.push(`/skjemaer/${res.documentId}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="relative">
      <Button onClick={() => setOpen((v) => !v)} disabled={pending}>
        <Plus className="size-4" />
        {tr("form_new_button", locale)}
        <ChevronDown className="size-3" />
      </Button>
      {error && (
        <p className="text-xs text-red mt-1 absolute right-0 max-w-xs">
          {error}
        </p>
      )}
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 bg-card border border-border rounded-md shadow-lg min-w-[300px] overflow-hidden">
          <div className="px-3 py-1.5 text-xs uppercase tracking-wider text-text-3 bg-surface">
            {tr("form_section_builtin", locale)}
          </div>
          {builtins.map((k) => (
            <button
              key={k}
              onClick={() => create(k)}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-card-hover"
            >
              {DOCUMENT_KIND_LABELS[k][locale]}
            </button>
          ))}
          {customTemplates.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs uppercase tracking-wider text-text-3 bg-surface border-t border-border">
                {tr("form_section_custom", locale)}
              </div>
              {customTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => create("custom", t.id)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-card-hover flex items-center justify-between"
                >
                  <span>{t.name}</span>
                  {t.ai_generated && (
                    <Sparkles className="size-3 text-blue" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
