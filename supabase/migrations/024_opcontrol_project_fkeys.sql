-- OPControl: knytt prosjekter til kunder, sites og stages.
-- Eksisterende embedded customer_*-felt og site_*-felt på projects beholdes
-- som backup-data — flyttes til kunder/sites-tabellene over tid.

alter table public.projects add column if not exists customer_id uuid
  references public.customers(id) on delete set null;
alter table public.projects add column if not exists site_id uuid
  references public.sites(id) on delete set null;
alter table public.projects add column if not exists stage_id uuid
  references public.project_stages(id) on delete set null;

create index if not exists idx_projects_customer on public.projects(customer_id);
create index if not exists idx_projects_site on public.projects(site_id);
create index if not exists idx_projects_stage on public.projects(stage_id);
