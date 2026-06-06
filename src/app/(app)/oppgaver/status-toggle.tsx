"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/types/database";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { updateTask } from "./actions";

interface Props {
  taskId: string;
  current: TaskStatus;
}

const STATUS_OPTIONS: TaskStatus[] = ["initiated", "in_progress", "resolved"];

const TONE: Record<TaskStatus, string> = {
  initiated: "bg-yellow/10 text-yellow border-yellow/30",
  in_progress: "bg-blue/10 text-blue-soft border-blue/30",
  resolved: "bg-green/10 text-green border-green/30",
};

export function TaskStatusToggle({ taskId, current }: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<TaskStatus>(current);

  function change(next: TaskStatus) {
    if (next === value) return;
    setValue(next);
    startTransition(async () => {
      const res = await updateTask({ id: taskId, status: next });
      if (res.error) {
        alert(`${tr("task_error_prefix", locale)}${res.error}`);
        setValue(current);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <select
      value={value}
      onChange={(e) => change(e.target.value as TaskStatus)}
      disabled={pending}
      className={`text-xs px-2 py-1 rounded border font-medium cursor-pointer ${TONE[value]}`}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {TASK_STATUS_LABELS[s][locale]}
        </option>
      ))}
    </select>
  );
}
