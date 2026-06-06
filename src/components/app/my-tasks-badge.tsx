"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

interface Counts {
  tasks: number;
  deviations: number;
  certs: number;
  total: number;
}

const ZERO: Counts = { tasks: 0, deviations: 0, certs: 0, total: 0 };

// Henter åpne saker for innlogget bruker + realtime-oppdatering.
// Brukes til badge på sidebar-linken «Mine oppgaver» og toast ved ny tildeling.
export function MyTasksBadge() {
  const { locale } = useLocale();
  const [counts, setCounts] = useState<Counts>(ZERO);
  const [toast, setToast] = useState<string | null>(null);
  const lastTotalRef = useRef<number | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tasksChannel: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let deviationsChannel: any = null;

    async function fetchCounts() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      userIdRef.current = user.id;

      // Én RPC-call istedenfor 3 separate count queries
      const { data, error } = await supabase.rpc("get_my_open_counts");
      if (error || cancelled || !data || data.length === 0) return;
      const row = data[0] as {
        tasks_count: number;
        deviations_count: number;
        certs_expiring_count: number;
      };
      const t = row.tasks_count ?? 0;
      const d = row.deviations_count ?? 0;
      const c = row.certs_expiring_count ?? 0;
      const total = t + d + c;

      // Toast hvis total har økt siden forrige måling (= ny tildeling)
      if (
        lastTotalRef.current !== null &&
        total > lastTotalRef.current
      ) {
        const diff = total - lastTotalRef.current;
        setToast(
          diff === 1
            ? tr("my_tasks_badge_new_one", locale)
            : tr("my_tasks_badge_new_many", locale).replace("{n}", String(diff)),
        );
        setTimeout(() => setToast(null), 5000);
      }
      lastTotalRef.current = total;

      setCounts({ tasks: t, deviations: d, certs: c, total });
    }

    fetchCounts();
    // 90 sek polling — Realtime håndterer instant updates ved tildeling
    interval = setInterval(fetchCounts, 90000);

    // Realtime — lytt på endringer på tasks og deviations
    async function setupRealtime() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      tasksChannel = supabase
        .channel("my-tasks-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `assigned_to=eq.${user.id}`,
          },
          () => fetchCounts(),
        )
        .subscribe();

      deviationsChannel = supabase
        .channel("my-deviations-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "deviations",
            filter: `assigned_to=eq.${user.id}`,
          },
          () => fetchCounts(),
        )
        .subscribe();
    }
    setupRealtime();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (tasksChannel) supabase.removeChannel(tasksChannel);
      if (deviationsChannel) supabase.removeChannel(deviationsChannel);
    };
  }, []);

  return (
    <>
      {/* Badge — vises kun når > 0 */}
      {counts.total > 0 && (
        <span
          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-orange text-bg text-[10px] font-bold animate-pulse"
          title={badgeTitle(counts, locale)}
        >
          {counts.total > 99 ? "99+" : counts.total}
        </span>
      )}

      {/* Toast — slide-inn nederst til høyre */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-2 fade-in">
          <a
            href="/mine-oppgaver"
            className="flex items-center gap-3 bg-card border border-orange/40 rounded-lg shadow-lg px-4 py-3 text-sm hover:bg-card-hover transition-colors"
          >
            <span className="size-2 rounded-full bg-orange animate-pulse" />
            <span className="text-text-1">{toast}</span>
            <span className="text-xs text-text-3">{tr("my_tasks_badge_see", locale)} →</span>
          </a>
        </div>
      )}
    </>
  );
}

function badgeTitle(c: Counts, locale: "no" | "en"): string {
  const parts: string[] = [];
  if (c.tasks > 0)
    parts.push(tr("my_tasks_badge_n_tasks", locale).replace("{n}", String(c.tasks)));
  if (c.deviations > 0)
    parts.push(
      tr("my_tasks_badge_n_deviations", locale).replace("{n}", String(c.deviations)),
    );
  if (c.certs > 0)
    parts.push(tr("my_tasks_badge_n_certs", locale).replace("{n}", String(c.certs)));
  return parts.join(" · ") || tr("my_tasks_badge_none", locale);
}
