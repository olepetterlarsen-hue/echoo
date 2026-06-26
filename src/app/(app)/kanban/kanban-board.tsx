"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import type { ProjectStage, ProjectStatus, InstallationType } from "@/lib/types/database";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { moveProjectToStage } from "./actions";

interface ProjectCard {
  id: string;
  project_number: string;
  title: string;
  status: ProjectStatus;
  installation_type: InstallationType | null;
  stage_id: string | null;
  customer_id: string | null;
  customer?: { id: string; name: string } | null;
}

interface Props {
  stages: ProjectStage[];
  projects: ProjectCard[];
}

const UNASSIGNED_KEY = "__unassigned__";

export function KanbanBoard({ stages, projects }: Props) {
  const { locale } = useLocale();
  const [items, setItems] = useState(projects);

  const groups = new Map<string, ProjectCard[]>();
  groups.set(UNASSIGNED_KEY, []);
  for (const s of stages) groups.set(s.id, []);
  for (const p of items) {
    const key = p.stage_id ?? UNASSIGNED_KEY;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  function onMoved(projectId: string, newStageId: string | null) {
    setItems((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, stage_id: newStageId } : p)),
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      <Column
        key={UNASSIGNED_KEY}
        aria-label={tr("kanban_col_no_stage", locale)}
        title={tr("kanban_col_no_stage", locale)}
        color="#58585F"
        items={groups.get(UNASSIGNED_KEY) ?? []}
        stages={stages}
        currentStageId={null}
        onMoved={onMoved}
      />
      {stages.map((stage) => (
        <Column
          key={stage.id}
          title={stage.name}
          color={stage.color ?? "#9A9AA4"}
          items={groups.get(stage.id) ?? []}
          stages={stages}
          currentStageId={stage.id}
          onMoved={onMoved}
        />
      ))}
    </div>
  );
}

function Column({
  title,
  color,
  items,
  stages,
  currentStageId,
  onMoved,
}: {
  title: string;
  color: string;
  items: ProjectCard[];
  stages: ProjectStage[];
  currentStageId: string | null;
  onMoved: (id: string, newStageId: string | null) => void;
}) {
  const { locale } = useLocale();
  return (
    <div className="flex-shrink-0 w-72">
      <div
        className="px-3 py-2 rounded-t-md text-sm font-semibold text-white flex items-center justify-between"
        style={{ backgroundColor: color }}
      >
        <span>{title}</span>
        <span className="text-xs opacity-80">{items.length}</span>
      </div>
      <div className="bg-card border border-border border-t-0 rounded-b-md p-2 min-h-[120px] space-y-2">
        {items.length === 0 && (
          <p className="text-xs text-text-3 text-center py-4">
            {tr("kanban_col_empty", locale)}
          </p>
        )}
        {items.map((p) => (
          <ProjectCardItem
            key={p.id}
            project={p}
            stages={stages}
            currentStageId={currentStageId}
            onMoved={onMoved}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCardItem({
  project,
  stages,
  currentStageId,
  onMoved,
}: {
  project: ProjectCard;
  stages: ProjectStage[];
  currentStageId: string | null;
  onMoved: (id: string, newStageId: string | null) => void;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function move(newStageId: string | null) {
    setOpen(false);
    startTransition(async () => {
      const res = await moveProjectToStage({
        projectId: project.id,
        stageId: newStageId,
      });
      if (!res.error) {
        onMoved(project.id, newStageId);
        router.refresh();
      }
    });
  }

  return (
    <div className="bg-surface border border-border rounded-md p-2.5 text-sm hover:border-orange/40 transition-colors">
      <Link
        href={`/prosjekter/${project.id}?tab=planlegging`}
        className="block font-medium text-text-1 hover:text-orange"
      >
        {project.title}
      </Link>
      <div className="text-xs text-text-3 font-mono mt-0.5">
        #{project.project_number}
      </div>
      {project.customer && (
        <div className="text-xs text-text-2 mt-1 truncate">
          {project.customer.name}
        </div>
      )}
      <div className="flex items-center justify-between gap-1 mt-2">
        {project.installation_type && (
          <Badge tone="neutral">{project.installation_type}</Badge>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          disabled={pending}
          className="text-xs text-text-3 hover:text-orange inline-flex items-center gap-1 ml-auto"
        >
          {tr("kanban_move", locale)}
          <ChevronDown className="size-3" />
        </button>
      </div>
      {open && (
        <div className="mt-2 border-t border-border pt-2 space-y-1">
          {stages.map((s) => (
            <button
              key={s.id}
              onClick={() => move(s.id)}
              disabled={s.id === currentStageId || pending}
              className={`w-full text-left text-xs px-2 py-1 rounded ${
                s.id === currentStageId
                  ? "bg-card text-text-3 cursor-not-allowed"
                  : "hover:bg-card-hover"
              }`}
            >
              {s.id === currentStageId ? "✓ " : ""}
              {s.name}
            </button>
          ))}
          {currentStageId !== null && (
            <button
              onClick={() => move(null)}
              className="w-full text-left text-xs px-2 py-1 rounded hover:bg-card-hover text-text-3"
            >
              {tr("kanban_remove_stage", locale)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
