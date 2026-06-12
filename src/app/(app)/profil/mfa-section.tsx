"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, KeyRound } from "lucide-react";
import { enrollTotp, confirmTotp, unenrollTotp } from "./mfa-actions";

interface Factor {
  id: string;
  friendly_name: string | null;
  status: "verified" | "unverified";
  created_at: string;
}

interface Props {
  factors: Factor[];
  orgRequires2fa: boolean;
}

export function MfaSection({ factors, orgRequires2fa }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<{
    factor_id: string;
    qr_svg: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");

  const verified = factors.filter((f) => f.status === "verified");
  const hasVerified = verified.length > 0;

  function startEnroll() {
    setError(null);
    startTransition(async () => {
      const res = await enrollTotp();
      if (res.error || !res.factor_id || !res.qr_svg || !res.secret) {
        setError(res.error ?? "Klarte ikke starte enrollment.");
        return;
      }
      setEnrollment({
        factor_id: res.factor_id,
        qr_svg: res.qr_svg,
        secret: res.secret,
      });
    });
  }

  function confirm() {
    if (!enrollment) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmTotp({
        factor_id: enrollment.factor_id,
        code,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setEnrollment(null);
      setCode("");
      router.refresh();
    });
  }

  function cancelEnroll() {
    if (!enrollment) return;
    setError(null);
    startTransition(async () => {
      await unenrollTotp({ factor_id: enrollment.factor_id });
      setEnrollment(null);
      setCode("");
      router.refresh();
    });
  }

  function removeFactor(factor_id: string) {
    if (
      orgRequires2fa &&
      verified.length === 1 &&
      verified[0].id === factor_id
    ) {
      if (
        !confirm_(
          "Bedriften krever 2FA. Hvis du fjerner denne faktoren vil du miste tilgang neste gang du logger inn. Fortsette likevel?",
        )
      )
        return;
    } else if (!confirm_("Fjerne 2FA-faktoren?")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await unenrollTotp({ factor_id });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function confirm_(msg: string): boolean {
    if (typeof window !== "undefined") return window.confirm(msg);
    return true;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <KeyRound className="size-4 text-orange" />
            To-faktor-autentisering (2FA)
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {orgRequires2fa && !hasVerified && (
          <div className="bg-yellow/10 border border-yellow/30 rounded-md px-3 py-2 text-sm text-yellow flex items-start gap-2">
            <ShieldAlert className="size-4 mt-0.5 shrink-0" />
            <div>
              <strong>Bedriften krever 2FA.</strong> Du må aktivere TOTP-2FA
              for å beholde tilgang til Echoo.
            </div>
          </div>
        )}

        {!hasVerified && !enrollment && (
          <>
            <p className="text-sm text-text-2">
              Bruk en autentiserings-app som Google Authenticator, 1Password,
              Authy eller Bitwarden. Du skanner en QR-kode og skriver inn et
              6-sifret engangspassord for å bekrefte.
            </p>
            <Button onClick={startEnroll} disabled={pending}>
              {pending ? "Starter…" : "Aktiver 2FA"}
            </Button>
          </>
        )}

        {enrollment && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="bg-white p-3 rounded border border-border">
                {/* Supabase returnerer QR som SVG-string */}
                <div
                  className="size-44"
                  dangerouslySetInnerHTML={{ __html: enrollment.qr_svg }}
                />
              </div>
              <div className="text-center">
                <div className="text-xs text-text-3">
                  Eller skriv inn nøkkelen manuelt:
                </div>
                <code className="text-xs font-mono text-text-1 break-all">
                  {enrollment.secret}
                </code>
              </div>
            </div>
            <Field label="6-sifret kode fra autentiserings-appen" required>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                autoComplete="one-time-code"
              />
            </Field>
            {error && <div className="text-sm text-red">{error}</div>}
            <div className="flex gap-2">
              <Button
                onClick={confirm}
                disabled={pending || code.length !== 6}
              >
                {pending ? "Verifiserer…" : "Bekreft og aktiver"}
              </Button>
              <Button
                variant="ghost"
                onClick={cancelEnroll}
                disabled={pending}
              >
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {hasVerified && !enrollment && (
          <div className="space-y-3">
            <div className="bg-green/10 border border-green/30 rounded-md px-3 py-2 text-sm text-green flex items-center gap-2">
              <ShieldCheck className="size-4" />
              <span>
                2FA er aktiv. Du blir bedt om kode ved innlogging.
              </span>
            </div>
            <ul className="divide-y divide-border border border-border rounded-md">
              {verified.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="text-sm">
                    <div className="text-text-1">
                      {f.friendly_name ?? "Authenticator-app"}
                    </div>
                    <div className="text-xs text-text-3">
                      Aktivert{" "}
                      {new Date(f.created_at).toLocaleDateString("nb-NO")}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFactor(f.id)}
                    disabled={pending}
                  >
                    Fjern
                  </Button>
                </li>
              ))}
            </ul>
            {error && <div className="text-sm text-red">{error}</div>}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
