-- 060_task_types_admin_policy.sql
-- Migration 039 erstattet alle task_types-policies med en enkel
-- _org_isolation som tillater alle medlemmer i en org å endre typer.
-- Vi vil at bare admin skal kunne endre, mens alle skal kunne lese.

drop policy if exists task_types_org_isolation on public.task_types;

-- Alle i org-en kan SE typer
create policy task_types_select on public.task_types
  for select to authenticated
  using (organization_id = (select public.current_organization_id()));

-- Bare admin kan INSERT/UPDATE/DELETE
create policy task_types_admin_write on public.task_types
  for all to authenticated
  using (
    organization_id = (select public.current_organization_id())
    and public.is_admin()
  )
  with check (
    organization_id = (select public.current_organization_id())
    and public.is_admin()
  );
