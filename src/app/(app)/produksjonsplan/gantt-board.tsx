"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { EntryPopup } from "./entry-popup";
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus, X, Check } from "lucide-react";
import {
  createSection,
  renameSection,
  deleteSection,
  moveSection,
  assignGroupToSection,
  moveGroup,
} from "./sections-actions";
import { moveScheduleEntry } from "./actions";

interface Group {
  id: string;
  name: string;
  color: string | null;
  email: string | null;
  gantt_section_id: string | null;
  gantt_sort_order: number;
}

interface Section {
  id: string;
  name: string;
  sort_order: number;
}

interface Entry {
  id: string;
  project_id: string | null;
  group_id: string | null;
  title: string | null;
  start_date: string;
  end_date: string;
  status: string;
  locked: boolean;
  locked_reason: string | null;
  projects?: {
    project_number: string;
    title: string;
    customer?: { name: string; map_color: string | null } | null;
  } | null;
}

interface OffPeriod {
  id: string;
  group_id: string | null;
  start_date: string;
  end_date: string;
  reason: string;
}

interface Props {
  groups: Group[];
  sections: Section[];
  entries: Entry[];
  offPeriods: OffPeriod[];
  projects: Array<{ id: string; project_number: string; title: string }>;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  todayStr: string;
  dateLocale: string;
  isAdmin: boolean;
}

const SECTION_HEADER_PX = 32;

const STATUS_COLORS: Record<string, { bg: string; ring: string }> = {
  planned: { bg: "#F47920", ring: "rgba(244,121,32,0.4)" },
  in_progress: { bg: "#3B82F6", ring: "rgba(59,130,246,0.4)" },
  done: { bg: "#10B981", ring: "rgba(16,185,129,0.4)" },
  revisit: { bg: "#EF4444", ring: "rgba(239,68,68,0.4)" },
};

const OFF_COLORS: Record<string, string> = {
  vacation: "rgba(245,158,11,0.18)",
  sick: "rgba(239,68,68,0.18)",
  holiday: "rgba(124,58,237,0.18)",
  other: "rgba(154,154,164,0.18)",
};

const DAY_PX = 36;
const LANE_PX = 56;
// Når en lane må vise flere parallelle entries, brukes disse for stabling
const SUB_ROW_PX = 26; // høyde per sub-row når 2+ entries overlapper
const SUB_PAD_PX = 6; // padding topp/bunn inni lanen
const VISIBLE_TEAMS_KEY = "opcontrol-gantt-visible-teams";

// Greedy interval-assignment: gir hver entry en sub-row-index slik at to
// entries som overlapper i tid aldri havner på samme sub-row.
function assignSubRows<E extends { start_date: string; end_date: string }>(
  entries: E[],
): { withRow: Array<E & { subRow: number }>; rowCount: number } {
  if (entries.length === 0) return { withRow: [], rowCount: 0 };
  const sorted = [...entries].sort((a, b) => {
    if (a.start_date < b.start_date) return -1;
    if (a.start_date > b.start_date) return 1;
    if (a.end_date < b.end_date) return -1;
    if (a.end_date > b.end_date) return 1;
    return 0;
  });
  // rowEnd[i] = end_date for siste entry plassert i sub-row i (eller "" hvis ledig)
  const rowEnd: string[] = [];
  const withRow: Array<E & { subRow: number }> = [];
  for (const e of sorted) {
    let placed = -1;
    for (let i = 0; i < rowEnd.length; i++) {
      // Ledig hvis tidligere entry sluttet før denne starter (strikt <, slik at
      // bar som slutter samme dag som ny bar starter ikke stables)
      if (rowEnd[i] < e.start_date) {
        placed = i;
        break;
      }
    }
    if (placed === -1) {
      placed = rowEnd.length;
      rowEnd.push(e.end_date);
    } else {
      rowEnd[placed] = e.end_date;
    }
    withRow.push({ ...e, subRow: placed });
  }
  return { withRow, rowCount: rowEnd.length };
}

export function GanttBoard({
  groups,
  sections,
  entries,
  offPeriods,
  projects,
  startDate,
  endDate,
  todayStr,
  dateLocale,
  isAdmin,
}: Props) {
  const { locale } = useLocale();
  const router = useRouter();
  // Valgt entry til popup
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  // Drag-and-drop-tilstand. dragRef holder den autoritative state-en
  // (oppdateres synkront i pointermove uten å forårsake re-render-loop),
  // dragState speiler den for rendering. moved = true så snart pointeren har
  // flyttet seg over 5-px-terskelen — bestemmer om slipp er et klikk
  // (åpner popup) eller et drag (lagrer flytt).
  type DragState = {
    entryId: string;
    originStartDayIdx: number;
    originEndDayIdx: number;
    originGroupId: string | null;
    startMouseX: number;
    startMouseY: number;
    dayDelta: number;
    hoverGroupId: string | null | undefined;
    moved: boolean;
  };
  const dragRef = useRef<DragState | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  function commitDrag(next: DragState | null) {
    dragRef.current = next;
    setDragState(next);
  }
  // Persisterer edit-modus så reload (etter handling) ikke kaster oss ut.
  // Bruker lazy useState-initializer istedet for useEffect — leser
  // sessionStorage én gang på mount uten cascade-render.
  const [editMode, setEditMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("opcontrol-gantt-edit") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      if (editMode) sessionStorage.setItem("opcontrol-gantt-edit", "1");
      else sessionStorage.removeItem("opcontrol-gantt-edit");
    } catch {
      /* ignore */
    }
  }, [editMode]);
  const [pending, startTransition] = useTransition();
  const [editError, setEditError] = useState<string | null>(null);
  const [editInfo, setEditInfo] = useState<string | null>(null);

  // Wrapper som kaller en action, viser feil, og refresher rute ved suksess.
  function runAction(fn: () => Promise<{ error?: string; ok?: boolean } | undefined>) {
    setEditError(null);
    setEditInfo(null);
    startTransition(async () => {
      const t0 = Date.now();
      try {
        const res = await fn();
        const dt = Date.now() - t0;
        console.log("[gantt action] result", { dt, res });
        if (res && "error" in res && res.error) {
          setEditError(res.error);
          return;
        }
        // Bevarer scroll-posisjon, full reload sikrer fersk RSC-data
        if (typeof window !== "undefined") {
          const y = window.scrollY;
          try {
            sessionStorage.setItem("opcontrol-gantt-scroll-y", String(y));
          } catch {
            /* ignore */
          }
          window.location.reload();
        } else {
          router.refresh();
        }
      } catch (e) {
        console.error("[gantt action] threw", e);
        setEditError("EXCEPTION: " + (e instanceof Error ? e.message : String(e)));
      }
    });
  }

  // Persistente synlige team (lagres pr browser). Lazy useState-initializer
  // leser sessionStorage på mount uten å trigge en setState-i-effect-cascade.
  const [visibleTeams, setVisibleTeams] = useState<Set<string>>(() => {
    const fallback = new Set(groups.map((g) => g.id).concat("__no_group__"));
    if (typeof window === "undefined") return fallback;
    try {
      const saved = sessionStorage.getItem(VISIBLE_TEAMS_KEY);
      if (!saved) return fallback;
      return new Set(JSON.parse(saved) as string[]);
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Restore scroll-posisjon etter Gantt-reload (rediger rekkefølge)
      const savedY = sessionStorage.getItem("opcontrol-gantt-scroll-y");
      if (savedY) {
        sessionStorage.removeItem("opcontrol-gantt-scroll-y");
        const y = parseInt(savedY, 10);
        if (!isNaN(y)) window.scrollTo(0, y);
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        VISIBLE_TEAMS_KEY,
        JSON.stringify([...visibleTeams]),
      );
    } catch {
      /* ignore */
    }
  }, [visibleTeams]);

  function toggleTeam(id: string) {
    setVisibleTeams((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function showAll() {
    setVisibleTeams(new Set(groups.map((g) => g.id).concat("__no_group__")));
  }
  function hideAll() {
    setVisibleTeams(new Set());
  }

  // Bygg dagvektor mellom start og slutt
  const days = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const arr: Date[] = [];
    let d = new Date(start);
    while (d <= end) {
      arr.push(new Date(d));
      d = new Date(d.getTime() + 86400000);
    }
    return arr;
  }, [startDate, endDate]);

  // Splittes etter måned for header
  const months: { label: string; cols: number }[] = useMemo(() => {
    const out: { label: string; cols: number }[] = [];
    let cur = "";
    for (const d of days) {
      const label = d.toLocaleDateString(dateLocale, {
        month: "long",
        year: "numeric",
      });
      if (label !== cur) {
        out.push({ label, cols: 1 });
        cur = label;
      } else {
        out[out.length - 1].cols += 1;
      }
    }
    return out;
  }, [days, dateLocale]);

  // Bygg rader i denne rekkefølgen: for hver seksjon i sort_order, vis section header + dens
  // grupper i gantt_sort_order. Deretter "unsectioned" grupper. Til slutt "Ingen team" lane.
  type SectionRow = { kind: "section"; sectionId: string; name: string };
  type LaneRow = {
    kind: "lane";
    id: string | null;
    toggleKey: string;
    name: string;
    color: string | null;
    sectionId: string | null;
  };
  type Row = SectionRow | LaneRow;

  const allLanes: LaneRow[] = [
    {
      kind: "lane",
      id: null,
      toggleKey: "__no_group__",
      name: tr("gantt_no_team", locale),
      color: null,
      sectionId: null,
    },
    ...groups.map((g) => ({
      kind: "lane" as const,
      id: g.id,
      toggleKey: g.id,
      name: g.name,
      color: g.color,
      sectionId: g.gantt_section_id,
    })),
  ];

  const rows: Row[] = [];
  for (const section of sections) {
    const sectionLanes = allLanes.filter((l) => l.sectionId === section.id);
    if (sectionLanes.length > 0 || editMode) {
      rows.push({ kind: "section", sectionId: section.id, name: section.name });
      for (const lane of sectionLanes) rows.push(lane);
    }
  }
  // Uten-seksjon-grupper (men med gruppe-tilhørighet)
  const unsectionedLanes = allLanes.filter(
    (l) => l.id !== null && l.sectionId === null,
  );
  if (unsectionedLanes.length > 0) {
    if (sections.length > 0) {
      rows.push({ kind: "section", sectionId: "__unsectioned__", name: tr("gantt_unsectioned", locale) });
    }
    for (const lane of unsectionedLanes) rows.push(lane);
  }
  // "Ingen team" lane (entries uten gruppe) — alltid sist
  const noTeamLane = allLanes.find((l) => l.id === null);
  if (noTeamLane) rows.push(noTeamLane);

  // Filtrer rows på synlige lanes (men behold seksjons-headers så lenge minst ett medlem er synlig)
  const visibleRows: Row[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.kind === "section") {
      // Slipp inn header hvis noen kommende lanes (før neste section) er synlige
      let hasVisible = false;
      for (let j = i + 1; j < rows.length; j++) {
        const next = rows[j];
        if (next.kind === "section") break;
        if (visibleTeams.has(next.toggleKey)) {
          hasVisible = true;
          break;
        }
      }
      if (hasVisible || editMode) visibleRows.push(r);
    } else if (visibleTeams.has(r.toggleKey)) {
      visibleRows.push(r);
    }
  }

  const totalWidth = days.length * DAY_PX;

  function dayIndex(dateStr: string): number {
    const startMs = new Date(startDate).getTime();
    const dayMs = new Date(dateStr).getTime();
    return Math.max(0, Math.round((dayMs - startMs) / 86400000));
  }
  function spanDays(s: string, e: string): number {
    return dayIndex(e) - dayIndex(s) + 1;
  }
  function dateFromDayIdx(idx: number): string {
    const ms = new Date(startDate).getTime() + idx * 86400000;
    return formatDate(new Date(ms));
  }

  // Drag-and-drop pointer-håndtering. Listeners registreres globalt og leser
  // alltid fra dragRef.current — dermed re-registreres de ikke for hver
  // mus-bevegelse.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const curr = dragRef.current;
      if (!curr) return;
      const dx = e.clientX - curr.startMouseX;
      const dy = e.clientY - curr.startMouseY;
      const moved = curr.moved || dx * dx + dy * dy > 25;
      const dayDelta = Math.round(dx / DAY_PX);
      let hoverGroupId: string | null | undefined = curr.hoverGroupId;
      if (moved) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const laneEl = (el as HTMLElement | null)?.closest<HTMLElement>(
          "[data-lane-key]",
        );
        if (laneEl) {
          const key = laneEl.dataset.laneKey;
          hoverGroupId = key === "__no_group__" ? null : (key ?? undefined);
        } else {
          hoverGroupId = undefined;
        }
      }
      if (
        dayDelta === curr.dayDelta &&
        moved === curr.moved &&
        hoverGroupId === curr.hoverGroupId
      ) {
        return;
      }
      const next: DragState = { ...curr, dayDelta, moved, hoverGroupId };
      dragRef.current = next;
      setDragState(next);
    }
    function onUp() {
      const curr = dragRef.current;
      if (!curr) return;
      // Rydd cursor og state først, så popup/refresh fyrer på neste tick
      dragRef.current = null;
      setDragState(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (curr.moved) {
        const newGroupId =
          curr.hoverGroupId !== undefined
            ? curr.hoverGroupId
            : curr.originGroupId;
        const newStart = dateFromDayIdx(curr.originStartDayIdx + curr.dayDelta);
        const newEnd = dateFromDayIdx(curr.originEndDayIdx + curr.dayDelta);
        const sameDates =
          curr.dayDelta === 0 && newGroupId === curr.originGroupId;
        if (!sameDates) {
          runAction(() =>
            moveScheduleEntry({
              id: curr.entryId,
              start_date: newStart,
              end_date: newEnd,
              group_id: newGroupId,
            }),
          );
        }
      } else {
        const entry = entries.find((e) => e.id === curr.entryId);
        if (entry) setSelectedEntry(entry);
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, startDate]);

  return (
    <>
    {selectedEntry && (
      <EntryPopup
        entry={selectedEntry}
        projects={projects}
        groups={groups.map((g) => ({ id: g.id, name: g.name, color: g.color }))}
        onClose={() => setSelectedEntry(null)}
      />
    )}
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${180 + totalWidth}px` }}>
          {/* Måned-header */}
          <div className="flex border-b border-border bg-surface">
            <div className="w-[180px] shrink-0 px-3 py-2 text-xs uppercase tracking-wider text-text-3 font-semibold">
              {tr("gantt_header_team", locale)}
            </div>
            {months.map((m, i) => (
              <div
                key={i}
                style={{ width: `${m.cols * DAY_PX}px` }}
                className="border-l border-border px-2 py-2 text-xs uppercase tracking-wider text-text-3 font-semibold text-center capitalize"
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Dag-header */}
          <div className="flex border-b border-border bg-surface/50">
            <div className="w-[180px] shrink-0" />
            {days.map((d, i) => {
              const isToday = formatDate(d) === todayStr;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={i}
                  style={{ width: `${DAY_PX}px` }}
                  className={`shrink-0 border-l border-border text-center py-1.5 text-[10px] ${
                    isToday
                      ? "bg-orange/20 text-orange font-bold"
                      : isWeekend
                        ? "text-text-3"
                        : "text-text-2"
                  }`}
                >
                  <div>{d.toLocaleDateString(dateLocale, { weekday: "short" }).slice(0, 2)}</div>
                  <div className="font-mono">{d.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* Swimlanes + section headers */}
          {visibleRows.map((row) => {
            if (row.kind === "section") {
              const isUnsectioned = row.sectionId === "__unsectioned__";
              return (
                <div
                  key={"sec-" + row.sectionId}
                  className="flex border-b border-border bg-orange/10"
                  style={{ height: `${SECTION_HEADER_PX}px`, minWidth: `${180 + totalWidth}px` }}
                >
                  <div className="w-[180px] shrink-0 px-3 flex items-center gap-1.5 border-r border-border">
                    <span className="text-xs uppercase tracking-wider font-bold text-orange truncate">
                      {row.name}
                    </span>
                  </div>
                  <div
                    className="flex-1 flex items-center justify-between px-3"
                    style={{ width: `${totalWidth}px` }}
                  >
                    {editMode && !isUnsectioned ? (
                      <SectionEditControls
                        section={{ id: row.sectionId, name: row.name }}
                        canMoveUp={
                          sections.findIndex((s) => s.id === row.sectionId) > 0
                        }
                        canMoveDown={
                          sections.findIndex((s) => s.id === row.sectionId) <
                          sections.length - 1
                        }
                        runAction={runAction}
                        pending={pending}
                      />
                    ) : (
                      <span className="text-[10px] text-orange/70 uppercase tracking-wider" />
                    )}
                  </div>
                </div>
              );
            }
            const lane = row;
            const laneEntries = entries.filter((e) => e.group_id === lane.id);
            const laneOff = offPeriods.filter((o) => o.group_id === lane.id);
            const { withRow: laneEntriesStacked, rowCount } = assignSubRows(
              laneEntries,
            );
            // Lane-høyde vokser med antall parallelle entries. Singel-rad
            // beholder gammel layout (LANE_PX, høy bar) for å se uendret ut.
            const isMulti = rowCount > 1;
            const laneHeight = isMulti
              ? rowCount * SUB_ROW_PX + 2 * SUB_PAD_PX
              : LANE_PX;
            const barHeight = isMulti ? SUB_ROW_PX - 4 : LANE_PX - 16;
            return (
              <div
                key={lane.id ?? "no-group"}
                data-lane-key={lane.id ?? "__no_group__"}
                className="flex border-b border-border relative"
                style={{ height: `${laneHeight}px` }}
              >
                {/* Lane-tittel */}
                <div className="w-[180px] shrink-0 px-3 py-2 bg-surface/30 border-r border-border flex items-center gap-2">
                  {lane.color && (
                    <span
                      className="inline-block size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: lane.color }}
                    />
                  )}
                  <span className="text-sm text-text-1 truncate flex-1">
                    {lane.name}
                  </span>
                  {editMode && lane.id !== null && (
                    <LaneEditControls
                      groupId={lane.id}
                      currentSectionId={lane.sectionId}
                      sections={sections}
                      runAction={runAction}
                      pending={pending}
                    />
                  )}
                </div>

                {/* Dag-grid bakgrunn */}
                <div className="relative" style={{ width: `${totalWidth}px` }}>
                  {/* Vertikale rutenett-linjer */}
                  {days.map((d, i) => {
                    const isToday = formatDate(d) === todayStr;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          left: `${i * DAY_PX}px`,
                          top: 0,
                          bottom: 0,
                          width: `${DAY_PX}px`,
                          borderLeft: "1px solid var(--color-border)",
                          background: isToday
                            ? "rgba(244,121,32,0.06)"
                            : isWeekend
                              ? "rgba(255,255,255,0.015)"
                              : "transparent",
                        }}
                      />
                    );
                  })}

                  {/* Off-perioder */}
                  {laneOff.map((off) => {
                    const offset = dayIndex(off.start_date) * DAY_PX;
                    const width = Math.max(
                      DAY_PX,
                      spanDays(off.start_date, off.end_date) * DAY_PX,
                    );
                    return (
                      <div
                        key={off.id}
                        title={`${off.reason} ${off.start_date} – ${off.end_date}`}
                        style={{
                          position: "absolute",
                          top: 4,
                          bottom: 4,
                          left: `${offset}px`,
                          width: `${width}px`,
                          background: `repeating-linear-gradient(45deg, ${OFF_COLORS[off.reason] ?? OFF_COLORS.other}, ${OFF_COLORS[off.reason] ?? OFF_COLORS.other} 6px, transparent 6px, transparent 12px)`,
                          borderRadius: "4px",
                          pointerEvents: "none",
                        }}
                      />
                    );
                  })}

                  {/* Entries (bars) */}
                  {laneEntriesStacked.map((entry) => {
                    const offset = dayIndex(entry.start_date) * DAY_PX;
                    const width = Math.max(
                      DAY_PX - 4,
                      spanDays(entry.start_date, entry.end_date) * DAY_PX - 4,
                    );
                    const colors = STATUS_COLORS[entry.status] ?? STATUS_COLORS.planned;
                    const customerColor = entry.projects?.customer?.map_color;
                    const bgColor = customerColor || colors.bg;
                    const title =
                      entry.title ||
                      entry.projects?.title ||
                      tr("gantt_untitled", locale);
                    const projNum = entry.projects?.project_number;
                    const lockedText = entry.locked
                      ? `\n${tr("gantt_locked_prefix", locale)}${entry.locked_reason || ""}`
                      : "";
                    const barTop = isMulti
                      ? SUB_PAD_PX + entry.subRow * SUB_ROW_PX
                      : 8;
                    const isDragging =
                      dragState?.entryId === entry.id && dragState.moved;
                    const dragLeftDelta = isDragging
                      ? dragState!.dayDelta * DAY_PX
                      : 0;
                    return (
                      <button
                        type="button"
                        key={entry.id}
                        onPointerDown={(e) => {
                          if (entry.locked) return;
                          if (e.button !== 0) return; // bare venstreklikk
                          e.preventDefault();
                          commitDrag({
                            entryId: entry.id,
                            originStartDayIdx: dayIndex(entry.start_date),
                            originEndDayIdx: dayIndex(entry.end_date),
                            originGroupId: entry.group_id,
                            startMouseX: e.clientX,
                            startMouseY: e.clientY,
                            dayDelta: 0,
                            hoverGroupId: undefined,
                            moved: false,
                          });
                          document.body.style.cursor = "grabbing";
                          document.body.style.userSelect = "none";
                        }}
                        title={`${title}${projNum ? ` (#${projNum})` : ""} — ${entry.start_date} → ${entry.end_date}${lockedText}\n${tr("gantt_tooltip_click", locale)}`}
                        style={{
                          position: "absolute",
                          top: barTop,
                          height: `${barHeight}px`,
                          left: `${offset + 2 + dragLeftDelta}px`,
                          width: `${width}px`,
                          background: bgColor,
                          borderRadius: "6px",
                          border: "none",
                          boxShadow: entry.locked
                            ? `inset 0 0 0 2px ${colors.ring}, 0 2px 6px rgba(0,0,0,0.25)`
                            : isDragging
                              ? `0 4px 12px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.35)`
                              : `0 2px 6px rgba(0,0,0,0.25)`,
                          color: "#fff",
                          padding: isMulti ? "1px 6px" : "4px 8px",
                          fontSize: isMulti ? "10px" : "11px",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          textAlign: "left",
                          cursor: entry.locked
                            ? "not-allowed"
                            : isDragging
                              ? "grabbing"
                              : "grab",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          opacity: isDragging
                            ? 0.85
                            : entry.status === "done"
                              ? 0.65
                              : 1,
                          zIndex: isDragging ? 20 : 1,
                          touchAction: "none",
                          transition: isDragging ? "none" : "left 0.12s ease",
                          userSelect: "none",
                        }}
                      >
                        {entry.locked && <span>🔒</span>}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                          {title}
                          {projNum && (
                            <span style={{ opacity: 0.7, marginLeft: "6px" }}>
                              #{projNum}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}

                  {/* Tom-state hvis ingen entries */}
                  {laneEntries.length === 0 && laneOff.length === 0 && lane.id !== null && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-text-3 pointer-events-none">
                      {tr("gantt_no_jobs", locale)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forklaring */}
      <div className="border-t border-border px-4 py-2 text-xs text-text-3 flex flex-wrap items-center gap-4">
        <span>{tr("gantt_status_label", locale)}</span>
        <LegendDot color="#F47920" label={tr("gantt_status_planned", locale)} />
        <LegendDot color="#3B82F6" label={tr("gantt_status_in_progress", locale)} />
        <LegendDot color="#10B981" label={tr("gantt_status_done", locale)} />
        <LegendDot color="#EF4444" label={tr("gantt_status_revisit", locale)} />
        <span className="ml-4">{tr("gantt_locked", locale)}</span>
        <span className="ml-4 inline-flex items-center gap-1.5">
          <span
            className="inline-block w-6 h-3 rounded"
            style={{
              background: `repeating-linear-gradient(45deg, ${OFF_COLORS.vacation}, ${OFF_COLORS.vacation} 4px, transparent 4px, transparent 8px)`,
            }}
          />
          {tr("gantt_off_legend", locale)}
        </span>
      </div>

      {/* Team-toggle nederst */}
      <div className="border-t border-border bg-surface/40 px-4 py-3">
        {editError && (
          <div className="mb-2 text-xs bg-red/10 border border-red/30 text-red rounded px-3 py-2 break-all">
            {editError}
          </div>
        )}
        {editInfo && (
          <div className="mb-2 text-xs bg-green/10 border border-green/30 text-green rounded px-3 py-2 break-all font-mono">
            {editInfo}
          </div>
        )}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="text-xs uppercase tracking-wider text-text-3 font-semibold">
            {tr("gantt_teams_board", locale)
              .replace("{visible}", String(visibleTeams.size))
              .replace("{total}", String(allLanes.length))}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setEditMode((v) => !v)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    editMode
                      ? "bg-orange/15 text-orange border-orange"
                      : "bg-card text-text-2 border-border hover:text-text-1"
                  }`}
                >
                  {editMode
                    ? tr("gantt_done_editing", locale)
                    : tr("gantt_edit_order", locale)}
                </button>
                {editMode && (
                  <NewSectionButton
                    runAction={runAction}
                    pending={pending}
                    locale={locale}
                  />
                )}
                <span className="text-text-3">·</span>
              </>
            )}
            <button
              type="button"
              onClick={showAll}
              className="text-xs text-text-3 hover:text-text-1 underline"
            >
              {tr("gantt_show_all", locale)}
            </button>
            <span className="text-text-3">·</span>
            <button
              type="button"
              onClick={hideAll}
              className="text-xs text-text-3 hover:text-text-1 underline"
            >
              {tr("gantt_hide_all", locale)}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
          {allLanes.map((lane) => {
            const active = visibleTeams.has(lane.toggleKey);
            return (
              <button
                key={lane.toggleKey}
                type="button"
                onClick={() => toggleTeam(lane.toggleKey)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors border ${
                  active
                    ? "bg-card border-orange/30 text-text-1"
                    : "bg-surface border-border text-text-3 opacity-50 hover:opacity-100"
                }`}
              >
                <span
                  className="inline-block size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: lane.color ?? "#9A9AA4" }}
                />
                <span className="truncate flex-1">{lane.name}</span>
                {active && <span className="text-orange">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
}

type RunAction = (
  fn: () => Promise<{ error?: string; ok?: boolean } | undefined>,
) => void;

function SectionEditControls({
  section,
  canMoveUp,
  canMoveDown,
  runAction,
  pending,
}: {
  section: { id: string; name: string };
  canMoveUp: boolean;
  canMoveDown: boolean;
  runAction: RunAction;
  pending: boolean;
}) {
  const { locale } = useLocale();
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(section.name);

  return (
    <div className="flex items-center gap-1 ml-auto">
      {renaming ? (
        <>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-6 rounded px-2 text-xs bg-surface border border-orange text-text-1 w-40 focus:outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                runAction(async () => {
                  const r = await renameSection(section.id, newName);
                  setRenaming(false);
                  return r;
                });
              } else if (e.key === "Escape") {
                setNewName(section.name);
                setRenaming(false);
              }
            }}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              runAction(async () => {
                const r = await renameSection(section.id, newName);
                setRenaming(false);
                return r;
              })
            }
            className="size-8 grid place-items-center rounded text-orange hover:bg-orange/10"
            aria-label={tr("save", locale)}
            title={tr("save", locale)}
          >
            <Check className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setNewName(section.name);
              setRenaming(false);
            }}
            className="size-8 grid place-items-center rounded text-text-3 hover:bg-card"
            aria-label={tr("cancel", locale)}
            title={tr("cancel", locale)}
          >
            <X className="size-3.5" />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={pending || !canMoveUp}
            onClick={() => runAction(() => moveSection(section.id, "up"))}
            className="size-8 grid place-items-center rounded text-text-2 hover:text-text-1 hover:bg-card disabled:opacity-30"
            aria-label={tr("gantt_move_up", locale)}
            title={tr("gantt_move_up", locale)}
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={pending || !canMoveDown}
            onClick={() => runAction(() => moveSection(section.id, "down"))}
            className="size-8 grid place-items-center rounded text-text-2 hover:text-text-1 hover:bg-card disabled:opacity-30"
            aria-label={tr("gantt_move_down", locale)}
            title={tr("gantt_move_down", locale)}
          >
            <ChevronDown className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setRenaming(true)}
            className="size-8 grid place-items-center rounded text-text-2 hover:text-text-1 hover:bg-card"
            aria-label={tr("gantt_rename", locale)}
            title={tr("gantt_rename", locale)}
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(tr("gantt_delete_section_confirm", locale).replace("{name}", section.name))) return;
              runAction(() => deleteSection(section.id));
            }}
            className="size-8 grid place-items-center rounded text-red hover:bg-red/10"
            aria-label={tr("delete", locale)}
            title={tr("delete", locale)}
          >
            <Trash2 className="size-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

function LaneEditControls({
  groupId,
  currentSectionId,
  sections,
  runAction,
  pending,
}: {
  groupId: string;
  currentSectionId: string | null;
  sections: Section[];
  runAction: RunAction;
  pending: boolean;
}) {
  const { locale } = useLocale();
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => runAction(() => moveGroup(groupId, "up"))}
        className="size-8 grid place-items-center rounded text-text-2 hover:text-text-1 hover:bg-card disabled:opacity-30"
        aria-label={tr("gantt_move_up", locale)}
        title={tr("gantt_move_up", locale)}
      >
        <ChevronUp className="size-3.5" />
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => runAction(() => moveGroup(groupId, "down"))}
        className="size-8 grid place-items-center rounded text-text-2 hover:text-text-1 hover:bg-card disabled:opacity-30"
        aria-label={tr("gantt_move_down", locale)}
        title={tr("gantt_move_down", locale)}
      >
        <ChevronDown className="size-3.5" />
      </button>
      <select
        disabled={pending}
        value={currentSectionId ?? ""}
        onChange={(e) => {
          const val = e.target.value || null;
          runAction(() => assignGroupToSection(groupId, val));
        }}
        className="h-6 rounded px-1 text-[10px] bg-surface border border-border text-text-2"
        aria-label={tr("gantt_move_to_section", locale)}
        title={tr("gantt_move_to_section", locale)}
      >
        <option value="">— {tr("gantt_unsectioned", locale)} —</option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function NewSectionButton({
  runAction,
  pending,
  locale,
}: {
  runAction: RunAction;
  pending: boolean;
  locale: ReturnType<typeof useLocale>["locale"];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  function save() {
    if (!name.trim()) return;
    runAction(async () => {
      const res = await createSection(name);
      if (!("error" in res)) {
        setName("");
        setOpen(false);
      }
      return res;
    });
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-1 rounded border bg-card text-text-2 border-border hover:text-text-1 inline-flex items-center gap-1"
      >
        <Plus className="size-3.5" />
        {tr("gantt_new_section", locale)}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={tr("gantt_section_name_placeholder", locale)}
        className="h-6 rounded px-2 text-xs bg-surface border border-orange text-text-1 w-44 focus:outline-none"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          else if (e.key === "Escape") {
            setName("");
            setOpen(false);
          }
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="size-8 grid place-items-center rounded text-orange hover:bg-orange/10"
      >
        <Check className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => {
          setName("");
          setOpen(false);
        }}
        className="size-8 grid place-items-center rounded text-text-3 hover:bg-card"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block size-3 rounded"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
