"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchProfile, toggleEchooStaff } from "./actions";

interface Found {
  id: string;
  email: string;
  full_name: string | null;
  is_echoo_staff: boolean;
}

export function StaffClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [found, setFound] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function search() {
    setError(null);
    setInfo(null);
    setFound(null);
    if (!email.trim()) return;
    startTransition(async () => {
      const res = await searchProfile(email);
      if (res.error) {
        setError(res.error);
        return;
      }
      setFound(res.found ?? null);
    });
  }

  function toggle() {
    if (!found) return;
    setError(null);
    startTransition(async () => {
      const res = await toggleEchooStaff({
        profile_id: found.id,
        is_echoo_staff: !found.is_echoo_staff,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setInfo(
        found.is_echoo_staff
          ? `${found.email} er fjernet som staff.`
          : `${found.email} er lagt til som staff.`,
      );
      setFound({ ...found, is_echoo_staff: !found.is_echoo_staff });
      router.refresh();
    });
  }

  return (
    <Card>
      <div className="px-5 py-3 border-b border-border">
        <h3 className="font-semibold text-text-1">Legg til / fjern staff</h3>
        <p className="text-xs text-text-3 mt-0.5">
          Brukeren må allerede ha en konto i Echoo (kan signup-e selv på
          /signup). Søk på e-post for å toggle staff-tilgang.
        </p>
      </div>
      <CardBody className="space-y-3">
        <div className="flex gap-2 items-end">
          <Field label="E-post">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  search();
                }
              }}
              placeholder="ole.nordmann@example.com"
            />
          </Field>
          <Button onClick={search} disabled={pending || !email.trim()}>
            {pending ? "Søker…" : "Søk"}
          </Button>
        </div>

        {error && <div className="text-sm text-red">{error}</div>}
        {info && (
          <div className="text-sm text-green bg-green/10 border border-green/30 rounded px-3 py-2">
            {info}
          </div>
        )}

        {found && (
          <div className="border border-border rounded-md p-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-text-1 text-sm">
                {found.full_name ?? found.email}
              </div>
              <div className="text-xs text-text-3">{found.email}</div>
              <div className="text-xs mt-1">
                Status:{" "}
                {found.is_echoo_staff ? (
                  <span className="text-orange font-medium">Echoo-staff</span>
                ) : (
                  <span className="text-text-3">Kunde / ikke staff</span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={toggle}
              disabled={pending}
              variant={found.is_echoo_staff ? "danger" : "primary"}
            >
              {found.is_echoo_staff ? "Fjern staff" : "Gjør til staff"}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
