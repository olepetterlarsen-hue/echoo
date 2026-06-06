"use client";

import { useState, useTransition } from "react";
import { MapPin } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { addProjectToMap } from "./actions";

interface Props {
  projectId: string;
}

export function AddToMapButton({ projectId }: Props) {
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "already" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const res = await addProjectToMap(projectId);
      if (res?.error) {
        setStatus("error");
        setError(res.error);
        return;
      }
      if (res?.alreadyOnMap) {
        setStatus("already");
        return;
      }
      setStatus("ok");
      // Reload så site-kortet viser ny "Vis på kart"-link og kartet får siten
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.reload();
      }, 700);
    });
  }

  if (status === "ok") {
    return (
      <span className="text-xs text-green inline-flex items-center gap-1">
        <MapPin className="size-3" />
        {tr("proj_add_to_map_done", locale)}
      </span>
    );
  }
  if (status === "already") {
    return (
      <span className="text-xs text-text-3 inline-flex items-center gap-1">
        <MapPin className="size-3" />
        {tr("proj_add_to_map_already", locale)}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="text-xs text-orange hover:underline inline-flex items-center gap-1 disabled:opacity-60"
      >
        <MapPin className="size-3" />
        {pending
          ? tr("proj_add_to_map_busy", locale)
          : tr("proj_add_to_map", locale)}
      </button>
      {status === "error" && error && (
        <span className="text-xs text-red">{error}</span>
      )}
    </div>
  );
}
