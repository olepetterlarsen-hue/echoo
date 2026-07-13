-- 073_dashboard_hotpath_indexes.sql
-- Dashboard-tellerne "mine oppgaver" filtrerer på (organization_id, assigned_to/
-- created_by) — 067 dekket status-stiene, men ikke per-bruker-stiene.
-- Partial-indekser matcher nøyaktig dashboard-queryenes where-klausuler.

-- Dashboard: mine åpne avvik (org, assigned_to, status != lukket).
create index if not exists idx_deviations_org_assigned
  on public.deviations (organization_id, assigned_to)
  where status != 'lukket';

-- Dashboard: mine utkast (org, created_by, status = utkast).
create index if not exists idx_documents_org_created_by
  on public.documents (organization_id, created_by)
  where status = 'utkast';

-- Dashboard: mine prosjekter (org, assigned_to, status != ferdigstilt).
create index if not exists idx_projects_org_assigned
  on public.projects (organization_id, assigned_to)
  where status != 'ferdigstilt';
