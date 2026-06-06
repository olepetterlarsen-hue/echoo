-- Storage buckets og policies
-- Kjør etter 001_initial_schema.sql

------------------------------------------------------------------
-- Buckets (private — kun signert URL eller via auth)
------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('certificates', 'certificates', false),
  ('documents', 'documents', false),
  ('project-files', 'project-files', false)
on conflict (id) do nothing;

------------------------------------------------------------------
-- certificates: brukere håndterer egne, admin ser alle
-- Path-konvensjon: {profile_id}/{filnavn}
------------------------------------------------------------------
drop policy if exists "cert_select_own" on storage.objects;
create policy "cert_select_own" on storage.objects for select
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.is_admin()
    )
  );

drop policy if exists "cert_insert_own" on storage.objects;
create policy "cert_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.is_admin()
    )
  );

drop policy if exists "cert_update_own" on storage.objects;
create policy "cert_update_own" on storage.objects for update
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.is_admin()
    )
  );

drop policy if exists "cert_delete_own" on storage.objects;
create policy "cert_delete_own" on storage.objects for delete
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.is_admin()
    )
  );

------------------------------------------------------------------
-- documents: alle aktive brukere kan lese; opprett ved insert
-- Path-konvensjon: {project_id}/{kind}/v{n}.pdf
------------------------------------------------------------------
drop policy if exists "docs_select" on storage.objects;
create policy "docs_select" on storage.objects for select
  using (bucket_id = 'documents' and public.is_active());

drop policy if exists "docs_insert" on storage.objects;
create policy "docs_insert" on storage.objects for insert
  with check (bucket_id = 'documents' and public.is_active());

drop policy if exists "docs_update" on storage.objects;
create policy "docs_update" on storage.objects for update
  using (bucket_id = 'documents' and public.is_active());

drop policy if exists "docs_delete_admin" on storage.objects;
create policy "docs_delete_admin" on storage.objects for delete
  using (bucket_id = 'documents' and public.is_admin());

------------------------------------------------------------------
-- project-files: alle aktive
------------------------------------------------------------------
drop policy if exists "pf_select" on storage.objects;
create policy "pf_select" on storage.objects for select
  using (bucket_id = 'project-files' and public.is_active());

drop policy if exists "pf_insert" on storage.objects;
create policy "pf_insert" on storage.objects for insert
  with check (bucket_id = 'project-files' and public.is_active());

drop policy if exists "pf_update" on storage.objects;
create policy "pf_update" on storage.objects for update
  using (bucket_id = 'project-files' and public.is_active());

drop policy if exists "pf_delete" on storage.objects;
create policy "pf_delete" on storage.objects for delete
  using (
    bucket_id = 'project-files'
    and (public.is_admin() or public.current_role() = 'prosjektleder')
  );
