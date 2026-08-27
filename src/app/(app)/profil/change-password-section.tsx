"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { changePassword } from "./actions";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export function ChangePasswordSection() {
  const { locale } = useLocale();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setError(null);

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setError(tr("profile_password_mismatch", locale));
      return;
    }

    startTransition(async () => {
      const res = await changePassword({ currentPassword, newPassword });
      if (res?.error) {
        setStatus("error");
        setError(res.error);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus("saved");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tr("profile_change_password", locale)}</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={tr("profile_current_password", locale)} required>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label={tr("profile_new_password", locale)} required>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label={tr("profile_confirm_password", locale)} required>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending || !hydrated}>
              {!hydrated
                ? tr("loading", locale)
                : pending
                  ? tr("profile_saving", locale)
                  : tr("profile_change_password", locale)}
            </Button>
            {status === "saved" && (
              <span className="text-sm text-green">
                {tr("profile_password_changed", locale)}
              </span>
            )}
            {status === "error" && error && (
              <span className="text-sm text-red">{error}</span>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
