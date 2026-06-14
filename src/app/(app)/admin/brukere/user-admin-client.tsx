"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import type { Profile, UserRole } from "@/lib/types/database";
import { createUser, updateUser, toggleActive, sendReset } from "./actions";

interface Props {
  users: Profile[];
}

export function UserAdminClient({ users: initialUsers }: Props) {
  const { locale } = useLocale();
  const [users, setUsers] = useState(initialUsers);

  function refresh(updated: Profile) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === updated.id);
      if (idx === -1) return [...prev, updated];
      const copy = [...prev];
      copy[idx] = updated;
      return copy;
    });
  }

  function add(newUser: Profile) {
    setUsers((prev) => [...prev, newUser]);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <CreateUserCard onCreated={add} />
      </div>
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {tr("adm_user_list_title", locale)} ({users.length})
            </CardTitle>
          </CardHeader>
          <CardBody className="!p-0">
            <ul className="divide-y divide-border">
              {users.map((u) => (
                <UserRow key={u.id} user={u} onUpdated={refresh} />
              ))}
              {users.length === 0 && (
                <li className="p-6 text-center text-text-3 text-sm">
                  {tr("adm_user_empty", locale)}
                </li>
              )}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function CreateUserCard({ onCreated }: { onCreated: (p: Profile) => void }) {
  const { locale } = useLocale();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("elektriker");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const res = await createUser({ email, password, full_name: fullName, role });
      if (res.error) setError(res.error);
      else {
        setMsg(tr("adm_user_created_msg", locale).replace("{email}", email));
        setEmail("");
        setFullName("");
        setPassword("");
        if (res.profile) onCreated(res.profile);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tr("adm_user_new_title", locale)}</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label={tr("adm_user_full_name", locale)} required>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label={tr("adm_user_email", locale)} required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field
            label={tr("adm_user_temp_password", locale)}
            required
            hint={tr("adm_user_temp_password_hint", locale)}
          >
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>
          <Field label={tr("adm_user_role", locale)} required>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            >
              <option value="montor">{tr("adm_user_role_montor", locale)}</option>
              <option value="elektriker">{tr("adm_user_role_elektriker", locale)}</option>
              <option value="prosjektleder">{tr("adm_user_role_prosjektleder", locale)}</option>
              <option value="bemyndiget">{tr("adm_user_role_bemyndiget", locale)}</option>
              <option value="installator">{tr("adm_user_role_installator", locale)}</option>
              <option value="admin">{tr("adm_user_role_admin", locale)}</option>
            </select>
          </Field>
          {error && (
            <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
              {error}
            </p>
          )}
          {msg && (
            <p className="text-sm text-green bg-green/10 border border-green/30 rounded px-3 py-2">
              {msg}
            </p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? tr("adm_user_creating", locale) : tr("adm_user_create", locale)}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function UserRow({
  user,
  onUpdated,
}: {
  user: Profile;
  onUpdated: (p: Profile) => void;
}) {
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<UserRole>(user.role);
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [hmsCard, setHmsCard] = useState(user.hms_card_number ?? "");

  function save() {
    startTransition(async () => {
      const res = await updateUser({
        id: user.id,
        role,
        full_name: fullName,
        phone,
        hms_card_number: hmsCard,
      });
      if (res.profile) onUpdated(res.profile);
      setEditing(false);
    });
  }

  function toggle() {
    startTransition(async () => {
      const res = await toggleActive({ id: user.id, active: !user.active });
      if (res.profile) onUpdated(res.profile);
    });
  }

  function reset() {
    startTransition(async () => {
      await sendReset({ email: user.email });
    });
  }

  if (editing) {
    return (
      <li className="px-5 py-4 space-y-3 bg-card-hover border-l-2 border-orange">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-3 mb-1">Navn</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-9 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-text-3 mb-1">Rolle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-9 rounded-md px-3 text-sm bg-surface border border-border"
            >
              <option value="montor">{tr("adm_user_role_montor", locale)}</option>
              <option value="elektriker">{tr("adm_user_role_elektriker", locale)}</option>
              <option value="prosjektleder">{tr("adm_user_role_prosjektleder", locale)}</option>
              <option value="bemyndiget">{tr("adm_user_role_bemyndiget", locale)}</option>
              <option value="installator">{tr("adm_user_role_installator", locale)}</option>
              <option value="admin">{tr("adm_user_role_admin_short", locale)}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-3 mb-1">Telefon</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+47 900 00 000"
              className="w-full h-9 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-text-3 mb-1">HMS-kort-nr</label>
            <input
              value={hmsCard}
              onChange={(e) => setHmsCard(e.target.value)}
              placeholder="123456789"
              className="w-full h-9 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Lagrer…" : tr("adm_user_save", locale)}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            {tr("adm_user_cancel", locale)}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="px-5 py-4 flex items-center gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-text-1 truncate">
          {user.full_name || tr("adm_user_unnamed", locale)}
        </div>
        <div className="text-xs text-text-3 truncate">{user.email}</div>
        {(user.phone || user.hms_card_number) && (
          <div className="text-[11px] text-text-3 mt-1 flex flex-wrap gap-x-3">
            {user.phone && <span>📱 {user.phone}</span>}
            {user.hms_card_number && (
              <span>💳 HMS: {user.hms_card_number}</span>
            )}
          </div>
        )}
      </div>

      <Badge
        tone={
          user.role === "admin"
            ? "orange"
            : user.role === "prosjektleder"
              ? "blue"
              : "neutral"
        }
      >
        {user.role}
      </Badge>

      <Badge tone={user.active ? "green" : "red"}>
        {user.active ? tr("adm_user_active", locale) : tr("adm_user_deactivated", locale)}
      </Badge>

      <div className="flex gap-1">
        {(
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Rediger
            </Button>
            <Button size="sm" variant="ghost" onClick={reset} disabled={pending}>
              {tr("adm_user_send_reset", locale)}
            </Button>
            <Button
              size="sm"
              variant={user.active ? "danger" : "secondary"}
              onClick={toggle}
              disabled={pending}
            >
              {user.active ? tr("adm_user_deactivate", locale) : tr("adm_user_activate", locale)}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
