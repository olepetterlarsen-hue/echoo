-- Utvid kompetansesenter-rettigheter:
--   Admin + Prosjektleder + Installatør kan
--   * Se alle kursbevis
--   * Laste opp på vegne av enhver bruker
--   * Slette/oppdatere alle
-- Vanlige brukere (elektriker) ser kun sine egne.

-- certificates table
drop policy if exists certificates_select on public.certificates;
create policy certificates_select on public.certificates
  for select using (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'prosjektleder')
  );

drop policy if exists certificates_insert on public.certificates;
create policy certificates_insert on public.certificates
  for insert with check (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'prosjektleder')
  );

drop policy if exists certificates_update on public.certificates;
create policy certificates_update on public.certificates
  for update using (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'prosjektleder')
  );

drop policy if exists certificates_delete on public.certificates;
create policy certificates_delete on public.certificates
  for delete using (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'prosjektleder')
  );

-- Storage policies for certificates bucket
drop policy if exists "cert_select_own" on storage.objects;
create policy "cert_select_own" on storage.objects for select
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'prosjektleder')
    )
  );

drop policy if exists "cert_insert_own" on storage.objects;
create policy "cert_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'prosjektleder')
    )
  );

drop policy if exists "cert_update_own" on storage.objects;
create policy "cert_update_own" on storage.objects for update
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'prosjektleder')
    )
  );

drop policy if exists "cert_delete_own" on storage.objects;
create policy "cert_delete_own" on storage.objects for delete
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'prosjektleder')
    )
  );
