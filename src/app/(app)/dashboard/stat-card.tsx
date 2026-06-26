"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * Dashboard-stat-kort med valgfri "+ ny"-handling.
 * Klient-komponent fordi den må bruke onClick på pluss-knappen for å
 * stoppe event-propagering opp til det ytre Link-en som spenner over
 * hele kortet.
 */
export function StatCard({
  icon,
  label,
  value,
  href,
  addHref,
  addTitle,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  href: string;
  addHref?: string;
  addTitle?: string;
  tone?: "neutral" | "orange" | "yellow";
}) {
  const toneClass =
    tone === "orange"
      ? "text-orange"
      : tone === "yellow"
        ? "text-yellow"
        : "text-text-2";
  return (
    <div className="bg-card hover:bg-card-hover border border-border rounded-lg p-5 transition-colors relative group">
      <Link href={href} className="absolute inset-0 z-0" aria-label={label} />
      <div className="relative z-10 flex items-center justify-between pointer-events-none">
        <span className="text-text-2 text-xs uppercase tracking-wider">
          {label}
        </span>
        <span className={toneClass}>{icon}</span>
      </div>
      <div className="relative z-10 text-2xl font-semibold mt-2 pointer-events-none">
        {value}
      </div>
      {addHref && (
        <Link
          href={addHref}
          title={addTitle ?? "Opprett ny"}
          aria-label={addTitle ?? "Opprett ny"}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2 right-2 z-20 size-8 grid place-items-center rounded-md bg-orange/15 text-orange hover:bg-orange hover:text-bg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <Plus className="size-4" />
        </Link>
      )}
    </div>
  );
}
