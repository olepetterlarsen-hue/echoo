-- Steg 2: Kjør etter 012_bemyndiget_montor_roles.sql.
-- Oppdaterer RLS-policies for å:
--   * Gi Bemyndiget samme rettigheter som Installatør
--   * Inkludere Montør i samme rettighetsgruppe som Elektriker
--
-- Selve signerings-restriksjon på Samsvarserklæring håndteres i
-- server-action (src/app/(app)/prosjekter/[id]/dokumenter/[kind]/actions.ts),
-- ikke i RLS, fordi det krever å sjekke kind=samsvarserklaering ved signering.

-- prosjekter — Bemyndiget kan oppdatere på lik linje med Installatør/Prosjektleder
drop policy if exists projects_update_assigned on public.projects;
create policy projects_update_assigned on public.projects
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
      or assigned_to = auth.uid()
      or created_by = auth.uid()
    )
  );

-- dokumenter
drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
      or created_by = auth.uid()
    )
  );

-- avvik
drop policy if exists deviations_update on public.deviations;
create policy deviations_update on public.deviations
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
      or assigned_to = auth.uid()
      or reported_by = auth.uid()
    )
  );

-- certificates — Bemyndiget med samme rettigheter som elevated roller
drop policy if exists certificates_select on public.certificates;
create policy certificates_select on public.certificates
  for select using (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists certificates_insert on public.certificates;
create policy certificates_insert on public.certificates
  for insert with check (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists certificates_update on public.certificates;
create policy certificates_update on public.certificates
  for update using (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists certificates_delete on public.certificates;
create policy certificates_delete on public.certificates
  for delete using (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

-- storage — certificates bucket
drop policy if exists "cert_select_own" on storage.objects;
create policy "cert_select_own" on storage.objects for select
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
    )
  );

drop policy if exists "cert_insert_own" on storage.objects;
create policy "cert_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
    )
  );

drop policy if exists "cert_update_own" on storage.objects;
create policy "cert_update_own" on storage.objects for update
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
    )
  );

drop policy if exists "cert_delete_own" on storage.objects;
create policy "cert_delete_own" on storage.objects for delete
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
    )
  );
