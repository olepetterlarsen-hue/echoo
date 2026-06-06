-- Egendefinerte dokumentmaler — opprettes av admin via UI.
-- Dokumenter laget fra disse har kind='custom' og data._template_id = uuid.

create table if not exists public.custom_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subtitle text,
  description text,
  definition jsonb not null default '{"sections": []}'::jsonb,
  is_hidden boolean not null default false,
  ai_generated boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create trigger trg_custom_templates_updated before update on public.custom_templates
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.custom_templates enable row level security;

drop policy if exists custom_templates_select on public.custom_templates;
create policy custom_templates_select on public.custom_templates
  for select using (public.is_active());

drop policy if exists custom_templates_admin_write on public.custom_templates;
create policy custom_templates_admin_write on public.custom_templates
  for all using (public.is_admin()) with check (public.is_admin());
