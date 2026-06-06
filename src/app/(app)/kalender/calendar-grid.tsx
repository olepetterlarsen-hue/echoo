"use client";

import Link from "next/link";
import { useState } from "react";

export type CalendarEventKind =
  | "project_start"
  | "project_end"
  | "deviation"
  | "doc_signed";

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  kind: CalendarEventKind;
  title: string;
  subtitle: string;
  href: string;
  color: string | null;
}

const KIND_DOT: Record<CalendarEventKind, string> = {
  project_start: "bg-orange",
  project_end: "bg-blue",
  deviation: "bg-yellow",
  doc_signed: "bg-green",
};

interface Props {
  year: number;
  month: number; // 1-12
  events: CalendarEvent[];
  weekdayLabels: [string, string, string, string, string, string, string];
  eventsCountTemplate: string;
  dateLocale: string;
}

export function CalendarGrid({
  year,
  month,
  events,
  weekdayLabels,
  eventsCountTemplate,
  dateLocale,
}: Props) {
  // Bygg liste av celler. Vi viser hele uker (man-søn) som dekker måneden.
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);
  // Norsk uke starter på mandag. JS Date.getDay() returnerer 0=søn, 1=man, ...
  const firstWeekday = firstOfMonth.getDay() === 0 ? 7 : firstOfMonth.getDay();
  const leadingPad = firstWeekday - 1;
  const totalDays = lastOfMonth.getDate();
  const totalCells = Math.ceil((leadingPad + totalDays) / 7) * 7;

  // Group events by date string
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const list = eventsByDate.get(ev.date) ?? [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }

  const cells: Array<{ date: Date | null; isCurrentMonth: boolean }> = [];
  for (let i = 0; i < leadingPad; i++) {
    const d = new Date(year, month - 1, -leadingPad + i + 1);
    cells.push({ date: d, isCurrentMonth: false });
  }
  for (let i = 1; i <= totalDays; i++) {
    cells.push({ date: new Date(year, month - 1, i), isCurrentMonth: true });
  }
  for (let i = cells.length; i < totalCells; i++) {
    const d = new Date(year, month, i - cells.length + 1);
    cells.push({ date: d, isCurrentMonth: false });
  }

  const today = new Date();
  const todayStr = formatDate(today);

  const [selected, setSelected] = useState<string | null>(null);
  const selectedEvents = selected ? eventsByDate.get(selected) ?? [] : [];

  return (
    <div>
      {/* Ukedager-header */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekdayLabels.map((wd) => (
          <div
            key={wd}
            className="px-3 py-2 text-xs uppercase tracking-wider text-text-3 font-semibold text-center"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Måneds-grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          if (!cell.date) return <div key={idx} className="aspect-square" />;
          const dateStr = formatDate(cell.date);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selected;
          const dayEvents = eventsByDate.get(dateStr) ?? [];

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelected(isSelected ? null : dateStr)}
              className={`relative aspect-square text-left p-2 border-r border-b border-border transition-colors ${
                cell.isCurrentMonth
                  ? "bg-card hover:bg-card-hover"
                  : "bg-bg/50 text-text-3"
              } ${isSelected ? "ring-2 ring-orange ring-inset" : ""} ${
                isToday ? "bg-orange/10" : ""
              }`}
            >
              <div
                className={`text-xs font-semibold ${
                  isToday ? "text-orange" : ""
                }`}
              >
                {cell.date.getDate()}
              </div>
              {dayEvents.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5 items-start">
                  {dayEvents.slice(0, 4).map((ev, i) => (
                    <span
                      key={i}
                      className={`size-2 rounded-full ${KIND_DOT[ev.kind]}`}
                      title={`${ev.title} — ${ev.subtitle}`}
                    />
                  ))}
                  {dayEvents.length > 4 && (
                    <span className="text-[10px] text-text-3 ml-0.5">
                      +{dayEvents.length - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Detaljvisning for valgt dag */}
      {selected && selectedEvents.length > 0 && (
        <div className="border-t border-border p-4">
          <div className="text-xs uppercase tracking-wider text-text-3 mb-2">
            {formatLong(selected, dateLocale)} —{" "}
            {eventsCountTemplate.replace(
              "{n}",
              String(selectedEvents.length),
            )}
          </div>
          <ul className="space-y-1">
            {selectedEvents.map((ev, i) => (
              <li key={i}>
                <Link
                  href={ev.href}
                  className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-card-hover"
                >
                  <span
                    className={`size-2 rounded-full shrink-0 ${KIND_DOT[ev.kind]}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-1 truncate">
                      {ev.title}
                    </div>
                    <div className="text-xs text-text-3 truncate">
                      {ev.subtitle}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatLong(dateStr: string, dateLocale: string): string {
  const [y, m, d] = dateStr.split("-").map((s) => parseInt(s, 10));
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
