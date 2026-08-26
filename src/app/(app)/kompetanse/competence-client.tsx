"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileDown, Trash2, UserPlus } from "lucide-react";
import type { Certificate, Profile } from "@/lib/types/database";
import {
  uploadCertificate,
  deleteCertificate,
  getCertificateUrl,
} from "./actions";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { useHydrated } from "@/lib/hooks/use-hydrated";

type CertWithProfile = Certificate & {
  profile?: {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
  } | null;
};

interface Props {
  myUserId: string;
  canManageAll: boolean;
  initial: CertWithProfile[];
  users: Profile[];
}

export function CompetenceClient({
  myUserId,
  canManageAll,
  initial,
  users,
}: Props) {
  const { locale } = useLocale();
  const [certs, setCerts] = useState(initial);
  const [filterUser, setFilterUser] = useState<string>("all");

  function add(c: CertWithProfile) {
    setCerts((prev) => [...prev, c]);
  }
  function remove(id: string) {
    setCerts((prev) => prev.filter((c) => c.id !== id));
  }

  const visible = useMemo(() => {
    if (!canManageAll || filterUser === "all") return certs;
    return certs.filter((c) => c.profile_id === filterUser);
  }, [certs, canManageAll, filterUser]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div>
        <UploadCard
          myUserId={myUserId}
          canManageAll={canManageAll}
          users={users}
          onAdded={add}
        />
        {canManageAll && users.length <= 1 && (
          <Card className="mt-4 border-orange/30 bg-orange/5">
            <CardBody className="text-sm space-y-2">
              <div className="flex items-center gap-2 text-orange font-medium">
                <UserPlus className="size-4" />
                {tr("cert_no_other_users_title", locale)}
              </div>
              <p className="text-text-2">
                {tr("cert_no_other_users_body", locale)}
              </p>
              <Link
                href="/admin/brukere"
                className="text-orange hover:underline text-sm"
              >
                {tr("cert_go_to_user_admin", locale)}
              </Link>
            </CardBody>
          </Card>
        )}
      </div>
      <div className="lg:col-span-2 space-y-3">
        {canManageAll && users.length > 1 && (
          <div className="flex items-center gap-2 text-sm">
            <label className="text-text-2">
              {tr("cert_show_for", locale)}
            </label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="h-9 rounded px-2 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            >
              <option value="all">
                {tr("cert_all_users_count", locale).replace(
                  "{n}",
                  String(certs.length),
                )}
              </option>
              {users.map((u) => {
                const n = certs.filter((c) => c.profile_id === u.id).length;
                return (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email} ({n})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {visible.length === 0 ? (
          <Card>
            <CardBody className="text-center text-text-3 text-sm">
              {filterUser === "all"
                ? tr("cert_empty_all", locale)
                : tr("cert_empty_for_user", locale)}
            </CardBody>
          </Card>
        ) : (
          visible.map((c) => (
            <CertCard
              key={c.id}
              cert={c}
              canEdit={c.profile_id === myUserId || canManageAll}
              onDeleted={() => remove(c.id)}
              showOwner={canManageAll}
            />
          ))
        )}
      </div>
    </div>
  );
}

function UploadCard({
  myUserId,
  canManageAll,
  users,
  onAdded,
}: {
  myUserId: string;
  canManageAll: boolean;
  users: Profile[];
  onAdded: (c: CertWithProfile) => void;
}) {
  const { locale } = useLocale();
  const [targetUserId, setTargetUserId] = useState<string>(myUserId);
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiresDate, setExpiresDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!file) {
      setError(tr("cert_select_file_err", locale));
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("profile_id", targetUserId);
      formData.append("name", name);
      formData.append("issuer", issuer);
      formData.append("issued_date", issuedDate);
      formData.append("expires_date", expiresDate);
      formData.append("notes", notes);
      const res = await uploadCertificate(formData);
      if (res.error) setError(res.error);
      else if (res.cert) {
        setInfo(tr("cert_saved_info", locale));
        onAdded(res.cert);
        setName("");
        setIssuer("");
        setIssuedDate("");
        setExpiresDate("");
        setNotes("");
        setFile(null);
        // Behold targetUserId så bruker slipper å velge på nytt
      }
    });
  }

  // Vis dropdown alltid for elevated roles — selv om bare seg selv i listen,
  // så er det synlig at funksjonen finnes
  const showUserSelector = canManageAll;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tr("cert_upload_title", locale)}</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-3">
          {showUserSelector && (
            <Field
              label={tr("cert_field_user", locale)}
              required
              hint={
                users.length > 1
                  ? tr("cert_field_user_hint_multi", locale)
                  : tr("cert_field_user_hint_solo", locale)
              }
            >
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email}
                    {u.id === myUserId ? tr("cert_me_suffix", locale) : ""}
                    {" · "}
                    {u.role}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label={tr("cert_field_name", locale)} required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field label={tr("cert_field_issuer", locale)}>
            <Input
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("cert_field_issued", locale)}>
              <Input
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
              />
            </Field>
            <Field
              label={tr("cert_field_expires", locale)}
              hint={tr("cert_field_expires_hint", locale)}
            >
              <Input
                type="date"
                value={expiresDate}
                onChange={(e) => setExpiresDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label={tr("cert_field_notes", locale)}>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Field label={tr("cert_field_file", locale)} required>
            <input
              type="file"
              accept=".pdf,image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
              className="block w-full text-sm text-text-2 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-orange file:text-bg file:cursor-pointer"
            />
          </Field>
          {error && <p className="text-sm text-red">{error}</p>}
          {info && <p className="text-sm text-green">{info}</p>}
          <Button type="submit" disabled={pending || !hydrated} className="w-full">
            <Upload className="size-4" />
            {!hydrated
              ? tr("loading", locale)
              : pending
                ? tr("cert_uploading", locale)
                : tr("cert_upload_cta", locale)}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function CertCard({
  cert,
  canEdit,
  onDeleted,
  showOwner,
}: {
  cert: CertWithProfile;
  canEdit: boolean;
  onDeleted: () => void;
  showOwner: boolean;
}) {
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const daysLeft = useMemo(() => {
    if (!cert.expires_date) return null;
    const exp = new Date(cert.expires_date);
    return Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [cert.expires_date]);

  function onDownload() {
    startTransition(async () => {
      const res = await getCertificateUrl({ filePath: cert.file_path });
      if (res.url) window.open(res.url, "_blank");
    });
  }

  function onDelete() {
    if (
      !confirm(
        tr("cert_confirm_delete", locale).replace("{name}", cert.name),
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteCertificate({
        id: cert.id,
        filePath: cert.file_path,
      });
      if (!res.error) onDeleted();
    });
  }

  const dateLocale = locale === "en" ? "en-GB" : "no-NO";

  return (
    <Card>
      <CardBody className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-text-1">{cert.name}</div>
          {cert.issuer && (
            <div className="text-sm text-text-2">{cert.issuer}</div>
          )}
          {showOwner && cert.profile && (
            <div className="text-xs text-orange mt-1">
              {cert.profile.full_name || cert.profile.email}
            </div>
          )}
          <div className="text-xs text-text-3 mt-2 flex flex-wrap gap-x-3">
            {cert.issued_date && (
              <span>
                {tr("cert_issued_label", locale)}{" "}
                {new Date(cert.issued_date).toLocaleDateString(dateLocale)}
              </span>
            )}
            {cert.expires_date && (
              <span>
                {tr("cert_expires_label", locale)}{" "}
                {new Date(cert.expires_date).toLocaleDateString(dateLocale)}
              </span>
            )}
          </div>
          {cert.notes && (
            <div className="text-xs text-text-2 mt-1">{cert.notes}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {daysLeft !== null && (
            <Badge
              tone={
                daysLeft < 0 ? "red" : daysLeft < 60 ? "yellow" : "green"
              }
            >
              {daysLeft < 0
                ? tr("cert_badge_expired", locale)
                : daysLeft < 60
                  ? tr("cert_badge_days", locale).replace(
                      "{n}",
                      String(daysLeft),
                    )
                  : tr("cert_badge_valid", locale)}
            </Badge>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={onDownload}
            disabled={pending}
          >
            <FileDown className="size-4" />
          </Button>
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              disabled={pending}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
