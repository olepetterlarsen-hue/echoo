-- 071_security_hardening.sql
-- Sikkerhetsgjennomgang 2026-07-03. To hull:
--
-- 1) PRIVILEGE ESCALATION (kritisk):
--    profiles_update_self (039) lot en bruker oppdatere sin egen rad uten
--    kolonne-restriksjon. En innlogget bruker kunne kalle PostgREST direkte
--    (anon-nøkkel + egen JWT) og sette role='admin' — eller verre, role=
--    'installator'/'bemyndiget' og dermed signere FEL §12-samsvarserklæringer
--    med juridisk vekt. Ingen trigger/kolonne-grant stoppet dette.
--
-- 2) AUDIT-LOGG TUKLING:
--    039 erstattet den opprinnelige insert-only-policyen på audit_log med en
--    generisk ALL-policy. Dermed kunne enhver bruker i org-en UPDATE/DELETE
--    egne revisjonsspor. Audit-logg skal være append-only.

------------------------------------------------------------------
-- 1) Hindre selv-eskalering av role / organisasjon / aktiv-status.
--
-- Server-side admin-flyter bruker service_role-klienten (createAdminClient),
-- som ikke har JWT → auth.uid() er null → triggeren slipper endringen gjennom.
-- Ekte admins via vanlig klient har is_admin() = true → tillatt.
-- Vanlige brukere som forsøker å endre role/organization_id/active på egen
-- rad → blokkert.
------------------------------------------------------------------
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role / server-side (ingen sesjon): tillat alt.
  if auth.uid() is null then
    return new;
  end if;

  if (
    new.role is distinct from old.role
    or new.organization_id is distinct from old.organization_id
    or new.active is distinct from old.active
  ) and not public.is_admin() then
    raise exception
      'Ikke tillatt: rolle, organisasjon og aktiv-status kan kun endres av administrator';
  end if;

  return new;
end $$;

drop trigger if exists trg_prevent_profile_priv on public.profiles;
create trigger trg_prevent_profile_priv
  before update on public.profiles
  for each row
  execute function public.prevent_profile_privilege_escalation();

------------------------------------------------------------------
-- 2) Gjør audit_log append-only for authenticated.
--    Dropp den generiske ALL-policyen (fra 039) og erstatt med separate
--    select + insert. Ingen update/delete-policy ⇒ RLS nekter tukling.
------------------------------------------------------------------
do $$
declare pol_name text;
begin
  for pol_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'audit_log'
  loop
    execute format('drop policy %I on public.audit_log', pol_name);
  end loop;
end $$;

create policy audit_log_select_org on public.audit_log
  for select to authenticated
  using (organization_id = (select public.current_organization_id()));

create policy audit_log_insert_org on public.audit_log
  for insert to authenticated
  with check (organization_id = (select public.current_organization_id()));

-- Ingen UPDATE/DELETE-policy: append-only. service_role beholder full
-- tilgang (bypass RLS) for evt. administrativ opprydding.

notify pgrst, 'reload schema';
