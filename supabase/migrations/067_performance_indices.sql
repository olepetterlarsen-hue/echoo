-- 067_performance_indices.sql
-- Composite-indekser for de hottesteste tenant-scoped query-stiene.
-- Identifisert i agent-review 2026-06-26: queries på (organization_id, X) får
-- ikke nytte av single-column-indeksene fra tidligere migrasjoner når
-- planlegger må kombinere RLS-org-filter med statusfilter.
--
-- Disse er trygge å kjøre — partial-index syntaks med "if not exists" og
-- ingen lock-tabeller på allerede-eksisterende rader.

-- /avvik?status=apen|under_arbeid|lukket — én av de hetteste API-kallene.
create index if not exists idx_deviations_org_status
  on public.deviations (organization_id, status);

-- /oppgaver?view=mine — bruker scoper på (org, assigned_to). Eksisterende
-- idx_tasks_assigned_to har bare assigned_to.
create index if not exists idx_tasks_org_assigned
  on public.tasks (organization_id, assigned_to)
  where status != 'resolved';

-- /skjemaer-listing + dashboard-utkast-teller — (org, status) er hovedfilter.
create index if not exists idx_documents_org_status_kind
  on public.documents (organization_id, status, kind);

-- /kompetanse + dashboard "min kompetanse" — (org, profile_id).
create index if not exists idx_certificates_org_profile
  on public.certificates (organization_id, profile_id);

-- Dashboard 90-dagers utløpende-teller — partial på (org, expires_date)
-- med expires_date not null.
create index if not exists idx_certificates_org_expires
  on public.certificates (organization_id, expires_date)
  where expires_date is not null;

-- /prosjekter list — typisk filtrert på (org, status).
create index if not exists idx_projects_org_status
  on public.projects (organization_id, status);
