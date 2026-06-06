"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Trash2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import type { Organization } from "@/lib/types/database";
import { saveOrgSettings, uploadOrgLogo, removeOrgLogo } from "./actions";

interface Props {
  org: Organization;
}

export function OrgSettingsEditor({ org }: Props) {
  const { locale } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const [firma, setFirma] = useState(org.firma ?? "");
  const [orgNr, setOrgNr] = useState(org.org_nr ?? "");
  const [adresse, setAdresse] = useState(org.selskap_adresse ?? "");
  const [postnr, setPostnr] = useState(org.selskap_postnr ?? "");
  const [sted, setSted] = useState(org.selskap_sted ?? "");
  const [telefon, setTelefon] = useState(org.selskap_telefon ?? "");
  const [epost, setEpost] = useState(org.selskap_epost ?? "");
  const [installatorNavn, setInstallatorNavn] = useState(org.installator_navn ?? "");
  const [installatorTittel, setInstallatorTittel] = useState(org.installator_tittel ?? "");
  const [installatorTelefon, setInstallatorTelefon] = useState(org.installator_telefon ?? "");
  const [installatorEpost, setInstallatorEpost] = useState(org.installator_epost ?? "");
  const [primaryColor, setPrimaryColor] = useState(org.primary_color ?? "#F47920");
  const [logoUrl, setLogoUrl] = useState(org.logo_url ?? "");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const res = await saveOrgSettings({
        firma,
        org_nr: orgNr,
        selskap_adresse: adresse,
        selskap_postnr: postnr,
        selskap_sted: sted,
        selskap_telefon: telefon,
        selskap_epost: epost,
        installator_navn: installatorNavn,
        installator_tittel: installatorTittel,
        installator_telefon: installatorTelefon,
        installator_epost: installatorEpost,
        primary_color: primaryColor,
      });
      if (res?.error) {
        setStatus("error");
        setError(res.error);
      } else {
        setStatus("saved");
      }
    });
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    startTransition(async () => {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const res = await uploadOrgLogo({
          dataUrl,
          fileName: f.name,
          contentType: f.type,
        });
        if (res?.error) setError(res.error);
        else if (res?.publicUrl) setLogoUrl(res.publicUrl);
      };
      reader.readAsDataURL(f);
    });
  }

  function onRemoveLogo() {
    startTransition(async () => {
      const res = await removeOrgLogo();
      if (res?.error) setError(res.error);
      else setLogoUrl("");
    });
  }

  return (
    <form onSubmit={onSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tr("adm_org_branding", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <div className="text-xs text-text-2 font-medium mb-2">
              {tr("adm_org_logo_label", locale)}
            </div>
            {logoUrl ? (
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded border border-border">
                  <Image src={logoUrl} alt="Logo" width={120} height={40} unoptimized />
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={pending}
                  >
                    <Upload className="size-3.5 mr-1.5" />
                    {tr("adm_org_logo_replace", locale)}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRemoveLogo}
                    disabled={pending}
                  >
                    <Trash2 className="size-3.5 mr-1.5" />
                    {tr("delete", locale)}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileRef.current?.click()}
                disabled={pending}
              >
                <Upload className="size-4 mr-1.5" />
                {tr("adm_org_logo_upload", locale)}
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              className="hidden"
              onChange={onLogoChange}
            />
            <p className="text-xs text-text-3 mt-2">{tr("adm_org_logo_hint", locale)}</p>
          </div>

          <Field label={tr("adm_org_primary_color", locale)}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="size-10 rounded border border-border bg-surface"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="font-mono"
              />
            </div>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("adm_org_company", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={tr("signup_company_name", locale)} required>
            <Input value={firma} onChange={(e) => setFirma(e.target.value)} required />
          </Field>
          <Field label={tr("signup_org_number", locale)}>
            <Input value={orgNr} onChange={(e) => setOrgNr(e.target.value)} />
          </Field>
          <Field label={tr("adm_org_address", locale)}>
            <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={tr("adm_org_postal", locale)}>
              <Input value={postnr} onChange={(e) => setPostnr(e.target.value)} />
            </Field>
            <div className="col-span-2">
              <Field label={tr("adm_org_city", locale)}>
                <Input value={sted} onChange={(e) => setSted(e.target.value)} />
              </Field>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={tr("profile_phone", locale)}>
              <Input value={telefon} onChange={(e) => setTelefon(e.target.value)} />
            </Field>
            <Field label={tr("auth_email", locale)}>
              <Input type="email" value={epost} onChange={(e) => setEpost(e.target.value)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("adm_org_installator", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-xs text-text-3">{tr("adm_org_installator_help", locale)}</p>
          <Field label={tr("signup_your_name", locale)}>
            <Input value={installatorNavn} onChange={(e) => setInstallatorNavn(e.target.value)} />
          </Field>
          <Field label={tr("profile_title_label", locale)}>
            <Input
              value={installatorTittel}
              onChange={(e) => setInstallatorTittel(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={tr("profile_phone", locale)}>
              <Input
                value={installatorTelefon}
                onChange={(e) => setInstallatorTelefon(e.target.value)}
              />
            </Field>
            <Field label={tr("auth_email", locale)}>
              <Input
                type="email"
                value={installatorEpost}
                onChange={(e) => setInstallatorEpost(e.target.value)}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? tr("profile_saving", locale) : tr("save", locale)}
        </Button>
        {status === "saved" && (
          <span className="text-sm text-green">{tr("profile_saved_ok", locale)}</span>
        )}
        {status === "error" && error && <span className="text-sm text-red">{error}</span>}
      </div>
    </form>
  );
}
