"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { changePassword } from "./actions";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (newPassword !== confirmPassword) {
      setError("De nye passordene er ikke like.");
      return;
    }
    startTransition(async () => {
      const res = await changePassword({ currentPassword, newPassword });
      if (res?.error) {
        setError(res.error);
      } else {
        setInfo("Passordet er byttet.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Endre passord</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4 max-w-sm">
          <Field label="Gjeldende passord" required>
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field label="Nytt passord" required hint="Minst 8 tegn">
            <Input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="Bekreft nytt passord" required>
            <Input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>

          {error && <p className="text-sm text-red">{error}</p>}
          {info && <p className="text-sm text-green">{info}</p>}

          <Button type="submit" disabled={pending || !hydrated}>
            {!hydrated ? "Laster…" : pending ? "Bytter…" : "Bytt passord"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
