-- Steg 2: Kjør denne ETTER 003_installator_role.sql.
-- Gir Installatør samme rettigheter som Prosjektleder på prosjekter,
-- dokumenter og avvik (kan redigere alle, signere, lukke).

drop policy if exists projects_update_assigned on public.projects;
create policy projects_update_assigned on public.projects
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'prosjektleder')
      or assigned_to = auth.uid()
      or created_by = auth.uid()
    )
  );

drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'prosjektleder')
      or created_by = auth.uid()
    )
  );

drop policy if exists deviations_update on public.deviations;
create policy deviations_update on public.deviations
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'prosjektleder')
      or assigned_to = auth.uid()
      or reported_by = auth.uid()
    )
  );
