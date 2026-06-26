"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  X,
  FolderOpen,
  Building2,
  MapPin,
  AlertTriangle,
  ClipboardList,
  CheckSquare,
} from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

interface QuickAction {
  href: string;
  labelKey: Parameters<typeof tr>[0];
  icon: React.ReactNode;
}

const ACTIONS: QuickAction[] = [
  { href: "/prosjekter/ny", labelKey: "qc_project", icon: <FolderOpen className="size-4" /> },
  { href: "/kunder/ny", labelKey: "qc_customer", icon: <Building2 className="size-4" /> },
  { href: "/sites/ny", labelKey: "qc_site", icon: <MapPin className="size-4" /> },
  { href: "/avvik/ny", labelKey: "qc_deviation", icon: <AlertTriangle className="size-4" /> },
  { href: "/oppgaver/ny", labelKey: "qc_task", icon: <CheckSquare className="size-4" /> },
  { href: "/skjemaer", labelKey: "qc_form", icon: <ClipboardList className="size-4" /> },
];

export function QuickCreateFab() {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="fixed bottom-36 right-4 z-40">
      {open && (
        <div className="absolute bottom-14 right-0 mb-1 w-56 rounded-lg bg-surface border border-border shadow-2xl overflow-hidden">
          <ul className="py-1">
            {ACTIONS.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-1 hover:bg-card-hover"
                >
                  <span className="text-orange">{a.icon}</span>
                  {tr(a.labelKey, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={tr("qc_button", locale)}
        title={tr("qc_button", locale)}
        className="inline-flex items-center justify-center size-12 rounded-full bg-orange text-bg shadow-lg hover:bg-orange/90 transition-colors"
      >
        {open ? <X className="size-5" /> : <Plus className="size-5" />}
      </button>
    </div>
  );
}
