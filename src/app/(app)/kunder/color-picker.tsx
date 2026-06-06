"use client";

import { COLOR_SWATCHES, DEFAULT_MAP_COLOR } from "@/lib/customer-colors";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function CustomerColorPicker({ value, onChange }: Props) {
  const { locale } = useLocale();
  const effective = value ?? DEFAULT_MAP_COLOR;
  const isDefault = value === null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="inline-block size-10 rounded-full border-2 border-border shadow-md"
          style={{ backgroundColor: effective }}
        />
        <div className="text-sm">
          <div className="font-mono text-text-1">{effective.toUpperCase()}</div>
          <div className="text-xs text-text-3">
            {isDefault
              ? tr("cust_color_default_label", locale)
              : tr("cust_color_custom_label", locale)}
          </div>
        </div>
        {!isDefault && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-text-3 hover:text-text-1 underline ml-auto"
          >
            {tr("cust_color_reset", locale)}
          </button>
        )}
      </div>

      <div>
        <p className="text-xs text-text-3 mb-2">{tr("cust_color_quick", locale)}</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_SWATCHES.map((s) => {
            const active =
              value?.toLowerCase() === s.value.toLowerCase() ||
              (isDefault && s.value === DEFAULT_MAP_COLOR);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => onChange(s.value)}
                title={s.label}
                aria-label={s.label}
                className={`size-8 rounded-full border-2 transition-transform hover:scale-110 ${
                  active
                    ? "border-text-1 ring-2 ring-orange/40"
                    : "border-border"
                }`}
                style={{ backgroundColor: s.value }}
              />
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs text-text-3 mb-2">
          {tr("cust_color_custom_section", locale)}
        </p>
        <input
          type="color"
          value={effective}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-20 rounded-md border border-border bg-surface cursor-pointer"
        />
      </div>
    </div>
  );
}
