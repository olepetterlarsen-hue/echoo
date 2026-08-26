-- 079_document_attachments.sql
-- B4/F-15, I-25: bildevedlegg på dokumenter. En montør kan ikke dokumentere
-- sikringsskap, kursfortegnelse eller jordfeiltest med bilde noe sted i dag
-- (input[type=file] = 0 på 19 sider).
--
-- question_id er nullable: null = vedlegg på dokumentnivå (samsvarserklæring,
-- RUH, avvik), satt = vedlegg på et konkret sjekkpunkt (sluttkontroll,
-- risikovurdering). Matcher FieldDef.key fra document-templates — ingen FK,
-- siden template-feltene ikke er egne DB-rader.
--
-- Path-konvensjon i Storage: {organization_id}/{document_id}/{uuid}.{ext}
-- — samme "org_id først i path"-mønster som substance-sds (043), enklere
-- enn documents/certificates sin oppslags-basert variant siden vi ikke
-- trenger å slå opp organization_id via en annen tabell.

create table if not exists public.document_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  question_id text,
  storage_path text not null unique,
  filename text not null,
  mime text not null,
  size integer not null,
  taken_at timestamptz,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_document_attachments_doc
  on public.document_attachments(document_id);
create index if not exists idx_document_attachments_org
  on public.document_attachments(organization_id);

alter table public.document_attachments enable row level security;

drop policy if exists document_attachments_org on public.document_attachments;
create policy document_attachments_org on public.document_attachments
  for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

drop trigger if exists trg_document_attachments_set_org on public.document_attachments;
create trigger trg_document_attachments_set_org
  before insert on public.document_attachments
  for each row execute function public.set_organization_id_if_null();

comment on table public.document_attachments is
  'Bildevedlegg på dokumenter (dokumentnivå eller per sjekkpunkt via question_id). Låses sammen med dokumentet ved signering — ingen update-policy i Storage, kun insert/select/delete.';

------------------------------------------------------------------
-- Storage-bucket + policies
------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('document-attachments', 'document-attachments', false)
on conflict (id) do nothing;

drop policy if exists doc_attach_select_org on storage.objects;
create policy doc_attach_select_org on storage.objects
  for select to authenticated
  using (
    bucket_id = 'document-attachments'
    and (split_part(name, '/', 1))::uuid = (select public.current_organization_id())
  );

drop policy if exists doc_attach_insert_org on storage.objects;
create policy doc_attach_insert_org on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'document-attachments'
    and public.is_active()
    and (split_part(name, '/', 1))::uuid = (select public.current_organization_id())
  );

-- Ingen update-policy: et opplastet bilde er uforanderlig compliance-spor,
-- akkurat som signerte dokumenter.

drop policy if exists doc_attach_delete_org on storage.objects;
create policy doc_attach_delete_org on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'document-attachments'
    and (split_part(name, '/', 1))::uuid = (select public.current_organization_id())
    and (
      public.is_admin()
      or exists (
        select 1 from public.document_attachments da
        where da.storage_path = name and da.uploaded_by = auth.uid()
      )
    )
  );

notify pgrst, 'reload schema';
