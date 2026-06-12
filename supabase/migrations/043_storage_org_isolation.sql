-- 043_storage_org_isolation.sql
-- 002 satte storage-policies som bare sjekket is_active() / is_admin().
-- Det betyr at en bruker fra org A teknisk kunne hente filer fra org B
-- dersom de gjettet path-en. 039 fikset kun org-logos.
--
-- Her stramme vi de tre øvrige bucketsene:
--   certificates    — path: {profile_id}/{filename}
--   documents       — path: {project_id}/{kind}/v{n}.pdf
--                     ELLER standalone/{user_id}/{kind}/v{n}.pdf
--   project-files   — path: {project_id}/{filename...}
--
-- Strategi: en SQL helper resolver eier-organisasjonen ut fra path,
-- og policies krever match mot current_organization_id().

------------------------------------------------------------------
-- Helper: gitt en sti og bucket, returner organization_id eller null.
------------------------------------------------------------------
create or replace function public.storage_object_org_id(
  p_bucket text,
  p_name text
)
returns uuid
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  v_first text;
  v_second text;
  v_uuid uuid;
  v_org uuid;
begin
  if p_name is null or length(p_name) = 0 then
    return null;
  end if;
  v_first := split_part(p_name, '/', 1);

  if p_bucket = 'certificates' then
    -- {profile_id}/...
    begin v_uuid := v_first::uuid; exception when others then return null; end;
    select organization_id into v_org from public.profiles where id = v_uuid;
    return v_org;

  elsif p_bucket = 'documents' then
    if v_first = 'standalone' then
      v_second := split_part(p_name, '/', 2);
      begin v_uuid := v_second::uuid; exception when others then return null; end;
      select organization_id into v_org from public.profiles where id = v_uuid;
      return v_org;
    end if;
    -- {project_id}/...
    begin v_uuid := v_first::uuid; exception when others then return null; end;
    select organization_id into v_org from public.projects where id = v_uuid;
    return v_org;

  elsif p_bucket = 'project-files' then
    begin v_uuid := v_first::uuid; exception when others then return null; end;
    select organization_id into v_org from public.projects where id = v_uuid;
    return v_org;

  elsif p_bucket = 'substance-sds' then
    -- Path: {org_id}/{filename}. Vi setter v_org direkte fra path[0].
    begin v_uuid := v_first::uuid; exception when others then return null; end;
    return v_uuid;
  end if;

  return null;
end $$;

------------------------------------------------------------------
-- Drop 002-policies og opprett org-scopede erstatninger
------------------------------------------------------------------
do $$
declare pol_name text;
begin
  for pol_name in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in (
        'cert_select_own', 'cert_insert_own', 'cert_update_own', 'cert_delete_own',
        'docs_select', 'docs_insert', 'docs_update', 'docs_delete_admin',
        'pf_select', 'pf_insert', 'pf_update', 'pf_delete'
      )
  loop
    execute format('drop policy %I on storage.objects', pol_name);
  end loop;
end $$;

------------------------------------------------------------------
-- certificates
------------------------------------------------------------------
create policy cert_select_org on storage.objects
  for select to authenticated
  using (
    bucket_id = 'certificates'
    and public.storage_object_org_id('certificates', name) =
        (select public.current_organization_id())
  );

create policy cert_insert_org on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'certificates'
    and (
      -- Egen profil — path[0] = auth.uid()
      (split_part(name, '/', 1))::uuid = auth.uid()
      -- ...eller admin på egen org
      or (
        public.is_admin()
        and public.storage_object_org_id('certificates', name) =
            (select public.current_organization_id())
      )
    )
  );

create policy cert_update_org on storage.objects
  for update to authenticated
  using (
    bucket_id = 'certificates'
    and public.storage_object_org_id('certificates', name) =
        (select public.current_organization_id())
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.is_admin()
    )
  );

create policy cert_delete_org on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'certificates'
    and public.storage_object_org_id('certificates', name) =
        (select public.current_organization_id())
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.is_admin()
    )
  );

------------------------------------------------------------------
-- documents
------------------------------------------------------------------
create policy docs_select_org on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and public.storage_object_org_id('documents', name) =
        (select public.current_organization_id())
  );

create policy docs_insert_org on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.is_active()
    and public.storage_object_org_id('documents', name) =
        (select public.current_organization_id())
  );

create policy docs_update_org on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and public.is_active()
    and public.storage_object_org_id('documents', name) =
        (select public.current_organization_id())
  );

create policy docs_delete_org on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and public.is_admin()
    and public.storage_object_org_id('documents', name) =
        (select public.current_organization_id())
  );

------------------------------------------------------------------
-- project-files
------------------------------------------------------------------
create policy pf_select_org on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-files'
    and public.is_active()
    and public.storage_object_org_id('project-files', name) =
        (select public.current_organization_id())
  );

create policy pf_insert_org on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and public.is_active()
    and public.storage_object_org_id('project-files', name) =
        (select public.current_organization_id())
  );

create policy pf_update_org on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-files'
    and public.is_active()
    and public.storage_object_org_id('project-files', name) =
        (select public.current_organization_id())
  );

create policy pf_delete_org on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-files'
    and (public.is_admin() or public.current_role() = 'prosjektleder')
    and public.storage_object_org_id('project-files', name) =
        (select public.current_organization_id())
  );

------------------------------------------------------------------
-- substance-sds — sjekk om bucketen finnes
------------------------------------------------------------------
do $$
declare pol_name text;
begin
  for pol_name in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'sds_%'
  loop
    execute format('drop policy %I on storage.objects', pol_name);
  end loop;
end $$;

do $$ begin
  if exists (select 1 from storage.buckets where id = 'substance-sds') then
    execute $q$
      create policy sds_select_org on storage.objects
        for select to authenticated
        using (
          bucket_id = 'substance-sds'
          and public.storage_object_org_id('substance-sds', name) =
              (select public.current_organization_id())
        )
    $q$;
    execute $q$
      create policy sds_insert_org on storage.objects
        for insert to authenticated
        with check (
          bucket_id = 'substance-sds'
          and public.is_active()
          and public.storage_object_org_id('substance-sds', name) =
              (select public.current_organization_id())
        )
    $q$;
    execute $q$
      create policy sds_update_org on storage.objects
        for update to authenticated
        using (
          bucket_id = 'substance-sds'
          and public.is_active()
          and public.storage_object_org_id('substance-sds', name) =
              (select public.current_organization_id())
        )
    $q$;
    execute $q$
      create policy sds_delete_org on storage.objects
        for delete to authenticated
        using (
          bucket_id = 'substance-sds'
          and public.is_admin()
          and public.storage_object_org_id('substance-sds', name) =
              (select public.current_organization_id())
        )
    $q$;
  end if;
end $$;
