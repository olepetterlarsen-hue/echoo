"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/app/signature-pad";
import { saveProfile } from "./actions";
import { ROLE_LABELS, type Profile } from "@/lib/types/database";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

interface Props {
  profile: Profile;
}

export function ProfileEditor({ profile }: Props) {
  const { locale } = useLocale();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [title, setTitle] = useState(profile.title ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [signature, setSignature] = useState<string | null>(
    profile.signature_data_url,
  );
  const [notifyDeviationAssigned, setNotifyDeviationAssigned] = useState(
    profile.notify_deviation_assigned ?? true,
  );
  const [notifyCommentAdded, setNotifyCommentAdded] = useState(
    profile.notify_comment_added ?? true,
  );
  const [notifyTaskAssigned, setNotifyTaskAssigned] = useState(
    profile.notify_task_assigned ?? true,
  );
  const [notifyDailyDigest, setNotifyDailyDigest] = useState(
    profile.notify_daily_digest ?? false,
  );
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const res = await saveProfile({
        full_name: fullName,
        title,
        phone,
        signature_data_url: signature,
        notify_deviation_assigned: notifyDeviationAssigned,
        notify_comment_added: notifyCommentAdded,
        notify_task_assigned: notifyTaskAssigned,
        notify_daily_digest: notifyDailyDigest,
      });
      if (res?.error) {
        setStatus("error");
        setError(res.error);
      } else {
        setStatus("saved");
      }
    });
  }

  return (
    <form onSubmit={onSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tr("profile_personalia", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={tr("profile_email_label", locale)}>
            <Input value={profile.email} disabled />
          </Field>
          <Field label={tr("profile_full_name", locale)} required>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={tr("profile_title_label", locale)}
              hint={tr("profile_title_hint", locale)}
            >
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label={tr("profile_phone", locale)}>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
          </div>
          <Field label={tr("profile_role", locale)}>
            <Input value={ROLE_LABELS[profile.role][locale]} disabled />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("profile_email_notifications", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          <p className="text-sm text-text-2 mb-2">
            {tr("profile_email_notifications_help", locale)}{" "}
            <span className="font-medium text-text-1">{profile.email}</span>.
          </p>
          <NotifyToggle
            checked={notifyDeviationAssigned}
            onChange={setNotifyDeviationAssigned}
            label={tr("profile_notify_deviation_label", locale)}
            hint={tr("profile_notify_deviation_hint", locale)}
          />
          <NotifyToggle
            checked={notifyCommentAdded}
            onChange={setNotifyCommentAdded}
            label={tr("profile_notify_comment_label", locale)}
            hint={tr("profile_notify_comment_hint", locale)}
          />
          <NotifyToggle
            checked={notifyTaskAssigned}
            onChange={setNotifyTaskAssigned}
            label={tr("profile_notify_task_label", locale)}
            hint={tr("profile_notify_task_hint", locale)}
          />
          <NotifyToggle
            checked={notifyDailyDigest}
            onChange={setNotifyDailyDigest}
            label={tr("profile_notify_digest_label", locale)}
            hint={tr("profile_notify_digest_hint", locale)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("profile_signature_section", locale)}</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-text-2 mb-3">
            {tr("profile_signature_help_long", locale)}
          </p>
          <SignaturePad initialDataUrl={signature} onChange={setSignature} />
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? tr("profile_saving", locale) : tr("profile_save_changes", locale)}
        </Button>
        {status === "saved" && (
          <span className="text-sm text-green">{tr("profile_saved_ok", locale)}</span>
        )}
        {status === "error" && error && (
          <span className="text-sm text-red">{error}</span>
        )}
      </div>
    </form>
  );
}

function NotifyToggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex items-start gap-3 py-2 cursor-pointer hover:bg-card-hover -mx-2 px-2 rounded">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-orange mt-0.5"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-text-1">{label}</div>
        <div className="text-xs text-text-3">{hint}</div>
      </div>
    </label>
  );
}
