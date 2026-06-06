-- Admin skal kunne laste opp kursbevis på vegne av enhver bruker.
-- Storage-policy må tillate at admin skriver til {profile_id}/... selv
-- når profile_id ≠ auth.uid().

drop policy if exists "cert_insert_own" on storage.objects;
create policy "cert_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.is_admin()
    )
  );

-- Også for update — admin kan rette/erstatte filer
drop policy if exists "cert_update_own" on storage.objects;
create policy "cert_update_own" on storage.objects for update
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.is_admin()
    )
  );
