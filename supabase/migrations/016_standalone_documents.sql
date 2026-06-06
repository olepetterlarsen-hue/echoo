-- Frittstående skjemaer (uten prosjekt).
-- documents.project_id blir nullable. Elektro-dokumenter må fortsatt ha
-- prosjekt — håndheves i RLS.

alter table public.documents alter column project_id drop not null;

-- Oppdater select-policy: hvis project_id mangler, kun synlig for eier,
-- signerer, eller forhøyede roller.
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select using (
    public.is_active() and (
      project_id is not null
      or created_by = auth.uid()
      or signed_by = auth.uid()
      or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
    )
  );

-- Insert-policy: elektro-dokumenttyper må ha project_id
drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents
  for insert with check (
    public.is_active()
    and created_by = auth.uid()
    and (
      kind not in (
        'risikovurdering',
        'sluttkontroll',
        'samsvarserklaering',
        'forenklet_sikkerhet'
      )
      or project_id is not null
    )
  );

-- Indeks for raskere oppslag av frittstående dokumenter pr. bruker
create index if not exists idx_documents_standalone
  on public.documents(created_by)
  where project_id is null;
