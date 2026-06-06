"use client";

import { Field, Input } from "@/components/ui/input";
import type { CategoryFieldSchema } from "@/lib/types/database";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

interface Props {
  schema: CategoryFieldSchema;
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

// Renderer custom fields fra kategori-schema som styrer feltene.
// Verdiene lagres i prosjekt.category_data som en JSON-object.
export function CategoryFieldsRenderer({ schema, values, onChange }: Props) {
  const { locale } = useLocale();
  if (schema.length === 0) {
    return (
      <p className="text-xs text-text-3 italic">
        {tr("category_no_extra_fields", locale)}
      </p>
    );
  }

  function setValue(key: string, value: unknown) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="space-y-3">
      {schema.map((f) => {
        const v = values[f.key];
        switch (f.type) {
          case "text":
            return (
              <Field key={f.key} label={f.label} hint={f.hint} required={f.required}>
                <Input
                  value={typeof v === "string" ? v : ""}
                  onChange={(e) => setValue(f.key, e.target.value)}
                  required={f.required}
                />
              </Field>
            );
          case "number":
            return (
              <Field key={f.key} label={f.label} hint={f.hint} required={f.required}>
                <Input
                  type="number"
                  value={typeof v === "number" ? v : v != null ? String(v) : ""}
                  onChange={(e) =>
                    setValue(
                      f.key,
                      e.target.value === ""
                        ? null
                        : parseFloat(e.target.value),
                    )
                  }
                  required={f.required}
                />
              </Field>
            );
          case "dropdown":
            return (
              <Field key={f.key} label={f.label} hint={f.hint} required={f.required}>
                <select
                  value={typeof v === "string" ? v : ""}
                  onChange={(e) => setValue(f.key, e.target.value || null)}
                  required={f.required}
                  className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
                >
                  <option value="">{tr("select_placeholder", locale)}</option>
                  {(f.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </Field>
            );
          case "yes_no":
            return (
              <div key={f.key} className="space-y-1">
                <div className="text-xs text-text-2 font-medium">
                  {f.label}
                  {f.required && <span className="text-red ml-1">*</span>}
                </div>
                <div className="flex gap-2">
                  {[
                    { val: true, label: tr("yes", locale) },
                    { val: false, label: tr("no", locale) },
                  ].map((opt) => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => setValue(f.key, opt.val)}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        v === opt.val
                          ? "bg-orange/15 text-orange border-orange"
                          : "bg-card border-border text-text-2 hover:bg-card-hover"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {f.hint && (
                  <p className="text-xs text-text-3">{f.hint}</p>
                )}
              </div>
            );
        }
      })}
    </div>
  );
}
