"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { deleteTask } from "../actions";

export function TaskDeleteButton({
  taskId,
  taskTitle,
}: {
  taskId: string;
  taskTitle: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (
      !confirm(tr("task_delete_confirm", locale).replace("{title}", taskTitle))
    )
      return;
    startTransition(async () => {
      const res = await deleteTask({ id: taskId });
      if (res.error) alert(`${tr("task_error_prefix", locale)}${res.error}`);
      else router.push("/oppgaver");
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onDelete}
      disabled={pending}
      className="text-red hover:bg-red/10"
    >
      <Trash2 className="size-4" />
      {tr("delete", locale)}
    </Button>
  );
}
