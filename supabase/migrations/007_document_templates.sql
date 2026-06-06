-- Tabell for redigerbare dokumentmaler.
-- En rad per dokumenttype. Definisjonen lagres som jsonb.
-- Hvis rad mangler: applikasjonen faller tilbake til hardkodet default.

create table if not exists public.document_templates (
  kind document_kind primary key,
  definition jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

do $$ begin
  create trigger trg_document_templates_updated before update on public.document_templates
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

------------------------------------------------------------------
-- RLS
------------------------------------------------------------------
alter table public.document_templates enable row level security;

drop policy if exists doc_templates_select on public.document_templates;
create policy doc_templates_select on public.document_templates
  for select using (public.is_active());

drop policy if exists doc_templates_admin_write on public.document_templates;
create policy doc_templates_admin_write on public.document_templates
  for all using (public.is_admin())
  with check (public.is_admin());
