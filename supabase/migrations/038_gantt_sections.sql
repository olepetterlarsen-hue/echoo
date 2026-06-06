-- 038_gantt_sections.sql
-- Project-seksjoner i produksjonsplan-Gantt: gruppér team-lanes under
-- en valgfri seksjons-overskrift (f.eks. "BID12 Bergen"). Admin styrer
-- både rekkefølge på seksjoner og rekkefølge på team innen seksjon.

create table if not exists public.gantt_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gantt_sections_order on public.gantt_sections(sort_order);

do $$ begin
  create trigger trg_gantt_sections_updated before update on public.gantt_sections
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.groups
  add column if not exists gantt_section_id uuid
    references public.gantt_sections(id) on delete set null;

alter table public.groups
  add column if not exists gantt_sort_order integer not null default 0;

create index if not exists idx_groups_gantt_section on public.groups(gantt_section_id, gantt_sort_order);

alter table public.gantt_sections enable row level security;

drop policy if exists gantt_sections_select on public.gantt_sections;
create policy gantt_sections_select on public.gantt_sections
  for select using (public.is_active());

drop policy if exists gantt_sections_insert_admin on public.gantt_sections;
create policy gantt_sections_insert_admin on public.gantt_sections
  for insert with check (public.is_admin());

drop policy if exists gantt_sections_update_admin on public.gantt_sections;
create policy gantt_sections_update_admin on public.gantt_sections
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists gantt_sections_delete_admin on public.gantt_sections;
create policy gantt_sections_delete_admin on public.gantt_sections
  for delete using (public.is_admin());
