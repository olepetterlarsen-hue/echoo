-- 052_import_wizard.sql
-- AI-guided onboarding-import. Privat bucket org-imports per org-prefiks.
-- Brukes både i /onboarding/import og /admin/import-wizard (re-runnable).
--
-- Klassifisering og commit skjer i server actions, ingen tabell nødvendig
-- for sesjon-state — wizarden er stateless (klient holder state).
-- Filer som ikke konverteres til endelige records ryddes opp via TTL.

insert into storage.buckets (id, name, public)
values ('org-imports', 'org-imports', false)
on conflict (id) do nothing;

-- Dropp eldre policies hvis vi har rullet tidligere
do $$
declare pol_name text;
begin
  for pol_name in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'org_imports_%'
  loop
    execute format('drop policy %I on storage.objects', pol_name);
  end loop;
end $$;

-- Path: {org_id}/{session_id}/{filename}
create policy org_imports_select_org on storage.objects
  for select to authenticated
  using (
    bucket_id = 'org-imports'
    and (storage.foldername(name))[1] = (select public.current_organization_id())::text
  );

create policy org_imports_insert_org on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-imports'
    and (storage.foldername(name))[1] = (select public.current_organization_id())::text
    and public.is_active()
  );

create policy org_imports_update_org on storage.objects
  for update to authenticated
  using (
    bucket_id = 'org-imports'
    and (storage.foldername(name))[1] = (select public.current_organization_id())::text
    and public.is_active()
  );

create policy org_imports_delete_org on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'org-imports'
    and (storage.foldername(name))[1] = (select public.current_organization_id())::text
    and public.is_active()
  );
