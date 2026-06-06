"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import type {
  Deviation,
  DeviationSeverity,
  DeviationStatus,
  Profile,
} from "@/lib/types/database";
import {
  SEVERITY_LABELS,
  DEVIATION_STATUS_LABELS,
} from "@/lib/types/database";
import { createDeviation, updateDeviation } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

type DeviationWithProfiles = Deviation & {
  reported_by_profile?: { full_name: string | null } | null;
  assigned_to_profile?: { full_name: string | null } | null;
};

interface Props {
  projectId: string;
  initial: DeviationWithProfiles[];
}

export function DeviationsBlock({ projectId, initial }: Props) {
  const { locale } = useLocale();
  const [list, setList] = useState<DeviationWithProfiles[]>(initial);
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("*")
      .eq("active", true)
      .order("full_name")
      .then(({ data }) => setUsers((data ?? []) as Profile[]));
  }, []);

  return (
    <div className="space-y-3">
      {creating ? (
        <NewDeviationForm
          projectId={projectId}
          users={users}
          onCreated={(d) => {
            setList((prev) => [d, ...prev]);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          {tr("proj_dev_register", locale)}
        </Button>
      )}

      {list.length === 0 && !creating && (
        <Card>
          <CardBody className="text-center text-text-3 text-sm">
            {tr("proj_dev_empty", locale)}
          </CardBody>
        </Card>
      )}

      {list.map((d) => (
        <DeviationRow
          key={d.id}
          deviation={d}
          users={users}
          projectId={projectId}
          onUpdated={(updated) =>
            setList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
          }
        />
      ))}
    </div>
  );
}

function NewDeviationForm({
  projectId,
  users,
  onCreated,
  onCancel,
}: {
  projectId: string;
  users: Profile[];
  onCreated: (d: DeviationWithProfiles) => void;
  onCancel: () => void;
}) {
  const { locale } = useLocale();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<DeviationSeverity>("middels");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createDeviation({
        projectId,
        title,
        description,
        severity,
        assigned_to: assignedTo || null,
      });
      if (res.error) setError(res.error);
      else if (res.deviation) onCreated(res.deviation as unknown as DeviationWithProfiles);
    });
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label={tr("proj_dev_title_field", locale)} required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>
          <Field label={tr("proj_dev_description_field", locale)}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("proj_dev_severity", locale)}>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as DeviationSeverity)}
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="lav">{tr("proj_dev_sev_lav", locale)}</option>
                <option value="middels">{tr("proj_dev_sev_middels", locale)}</option>
                <option value="hoey">{tr("proj_dev_sev_hoey", locale)}</option>
                <option value="kritisk">{tr("proj_dev_sev_kritisk", locale)}</option>
              </select>
            </Field>
            <Field label={tr("proj_dev_assign", locale)}>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("proj_dev_none_assignee", locale)}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {error && <p className="text-sm text-red">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              {tr("proj_dev_cancel", locale)}
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? tr("proj_dev_saving", locale) : tr("proj_dev_register_button", locale)}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function DeviationRow({
  deviation,
  users,
  projectId,
  onUpdated,
}: {
  deviation: DeviationWithProfiles;
  users: Profile[];
  projectId: string;
  onUpdated: (d: DeviationWithProfiles) => void;
}) {
  const { locale } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const dateLocale = locale === "en" ? "en-GB" : "no-NO";
  const [resolution, setResolution] = useState(deviation.resolution ?? "");
  const [assignedTo, setAssignedTo] = useState(deviation.assigned_to ?? "");
  const [pending, startTransition] = useTransition();

  function change(status: DeviationStatus) {
    startTransition(async () => {
      const res = await updateDeviation({
        id: deviation.id,
        projectId,
        status,
        resolution,
        assigned_to: assignedTo || null,
      });
      if (res.deviation) onUpdated(res.deviation as unknown as DeviationWithProfiles);
    });
  }

  return (
    <Card>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-card-hover"
      >
        <Badge
          tone={
            deviation.severity === "kritisk"
              ? "red"
              : deviation.severity === "hoey"
              ? "orange"
              : deviation.severity === "middels"
              ? "yellow"
              : "neutral"
          }
        >
          {SEVERITY_LABELS[deviation.severity][locale]}
        </Badge>
        <div className="flex-1">
          <div className="text-text-1 font-medium">{deviation.title}</div>
          <div className="text-xs text-text-3">
            {deviation.reported_by_profile?.full_name ?? "?"} ·{" "}
            {new Date(deviation.created_at).toLocaleDateString(dateLocale)}
            {deviation.assigned_to_profile && (
              <> · {tr("proj_dev_assigned_prefix", locale)} {deviation.assigned_to_profile.full_name}</>
            )}
          </div>
        </div>
        <Badge
          tone={
            deviation.status === "apen"
              ? "red"
              : deviation.status === "under_arbeid"
              ? "yellow"
              : "green"
          }
        >
          {DEVIATION_STATUS_LABELS[deviation.status][locale]}
        </Badge>
      </button>
      {expanded && (
        <CardBody className="border-t border-border space-y-3">
          {deviation.description && (
            <p className="text-sm whitespace-pre-wrap text-text-2">
              {deviation.description}
            </p>
          )}
          <Field label={tr("proj_dev_assign", locale)}>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            >
              <option value="">{tr("proj_dev_none_assignee", locale)}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("proj_dev_action_field", locale)}>
            <Textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={2}
              placeholder={tr("proj_dev_action_placeholder", locale)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {deviation.status !== "under_arbeid" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => change("under_arbeid")}
                disabled={pending}
              >
                {tr("proj_dev_set_in_progress", locale)}
              </Button>
            )}
            {deviation.status !== "lukket" && (
              <Button
                size="sm"
                onClick={() => change("lukket")}
                disabled={pending || !resolution.trim()}
              >
                {tr("proj_dev_close", locale)}
              </Button>
            )}
            {deviation.status === "lukket" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => change("apen")}
                disabled={pending}
              >
                {tr("proj_dev_reopen", locale)}
              </Button>
            )}
          </div>
        </CardBody>
      )}
    </Card>
  );
}
