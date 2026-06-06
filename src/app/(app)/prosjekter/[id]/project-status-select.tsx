"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProjectStatus } from "@/lib/types/database";
import { updateProjectStatus } from "./actions";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import type { StringKey } from "@/lib/i18n/strings";

const OPTIONS: { value: ProjectStatus; key: StringKey }[] = [
  { value: "aktiv", key: "proj_status_select_aktiv" },
  { value: "paa_vent", key: "proj_status_select_paa_vent" },
  { value: "ferdigstilt", key: "proj_status_select_ferdigstilt" },
  { value: "arkivert", key: "proj_status_select_arkivert" },
];

interface Props {
  projectId: string;
  current: ProjectStatus;
}

export function ProjectStatusSelect({ projectId, current }: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as ProjectStatus;
    startTransition(async () => {
      const res = await updateProjectStatus({ projectId, status: newStatus });
      if (!res?.error) router.refresh();
    });
  }

  return (
    <select
      value={current}
      onChange={onChange}
      disabled={pending}
      className="h-9 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {tr(o.key, locale)}
        </option>
      ))}
    </select>
  );
}
