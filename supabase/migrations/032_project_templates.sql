-- OPControl: Prosjekt-maler — forhåndsutfylte starting points for nye prosjekter.
-- Admin definerer maler; ved opprettelse av nytt prosjekt kan bruker velge
-- "Start fra mal" som forhåndsfyller en gruppe felter.

create table if not exists public.project_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_category_id uuid references public.project_categories(id) on delete set null,
  default_phase project_phase,
  default_installation_type text,
  -- 'bolig' | 'naering' | 'telecom' | 'ev'
  default_description text,
  default_assigned_to uuid references public.profiles(id) on delete set null,
  default_stage_id uuid references public.project_stages(id) on delete set null,
  default_category_data jsonb not null default '{}'::jsonb,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_templates_active
  on public.project_templates(is_active, order_index);

do $$ begin
  create trigger trg_project_templates_updated before update on public.project_templates
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.project_templates enable row level security;

drop policy if exists project_templates_select on public.project_templates;
create policy project_templates_select on public.project_templates
  for select using (public.is_active());

drop policy if exists project_templates_admin on public.project_templates;
create policy project_templates_admin on public.project_templates
  for all using (public.is_admin()) with check (public.is_admin());

comment on table public.project_templates is
  'Forhåndsutfylte starting points for nye prosjekter. Admin-administrert.';
