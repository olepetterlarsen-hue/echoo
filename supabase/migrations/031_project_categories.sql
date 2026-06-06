-- OPControl: prosjektkategorier med admin-definerte custom fields.
-- field_schema er en JSON-array av felter; verdier lagres i projects.category_data.

create table if not exists public.project_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  field_schema jsonb not null default '[]'::jsonb,
  -- field_schema = [
  --   { "key": "voltage", "label": "Spenning (V)", "type": "number", "required": false },
  --   { "key": "phase_count", "label": "Faser", "type": "dropdown", "options": ["1-fase", "3-fase"] },
  --   { "key": "outdoor", "label": "Utendørs?", "type": "yes_no" },
  --   { "key": "comment", "label": "Kommentar", "type": "text" }
  -- ]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_categories_active on public.project_categories(is_active, order_index);

do $$ begin
  create trigger trg_project_categories_updated before update on public.project_categories
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- Seed default kategorier matchende OPCOM-spec
insert into public.project_categories (slug, name, description, order_index) values
  ('indoor', 'Indoor', 'Innendørs anlegg (kjøpesenter, kontor, bolig)', 10),
  ('rl', 'RL', 'Radiolink (radio-link mellom master)', 20),
  ('ran', 'RAN', 'Radio Access Network (basestasjoner)', 30),
  ('battery', 'Battery', 'Batterianlegg / strømforsyning', 40),
  ('roofsafety', 'Roofsafety', 'Takfeste og fallsikring', 50)
on conflict (slug) do nothing;

-- RLS
alter table public.project_categories enable row level security;

drop policy if exists project_categories_select on public.project_categories;
create policy project_categories_select on public.project_categories
  for select using (public.is_active());

drop policy if exists project_categories_admin on public.project_categories;
create policy project_categories_admin on public.project_categories
  for all using (public.is_admin()) with check (public.is_admin());

-- Knytting på prosjekt + custom field-data
alter table public.projects
  add column if not exists category_id uuid references public.project_categories(id) on delete set null,
  add column if not exists category_data jsonb not null default '{}'::jsonb;

create index if not exists idx_projects_category on public.projects(category_id);

comment on column public.projects.category_id is
  'Hvilken kategori prosjektet tilhører. Bestemmer custom fields som vises.';
comment on column public.projects.category_data is
  'Verdier for kategoriens custom fields (key/value JSON).';
