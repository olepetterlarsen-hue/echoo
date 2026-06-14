-- 056_seed_project_defaults.sql
-- Når en ny org opprettes skal de få fornuftige default-stadier og -grupper
-- så kanban-en fungerer fra dag én. Tidligere ble disse seedet globalt
-- (org_id = NULL) i migration 023, og blir derfor usynlige for nye orgs.
--
-- Vi utvider seed_iso_defaults_for_org (migration 050) med stages + groups.
-- Brukeren kan selv slette/redigere etterpå i /admin/prosjekt-oppsett.

create or replace function public.seed_iso_defaults_for_org(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1) Standard audit-sjekkliste for kvalitetssystem
  insert into public.audit_checklist_templates (
    organization_id, name, description, definition, is_active
  )
  values (
    p_org_id,
    'ISO 9001 internrevisjon — basis',
    'Standard sjekkliste for første internrevisjon av kvalitetssystemet.',
    jsonb_build_object(
      'sections', jsonb_build_array(
        jsonb_build_object(
          'title', 'Ledelse og policy',
          'items', jsonb_build_array(
            jsonb_build_object('key', 'policy_documented', 'question', 'Er kvalitetspolicy dokumentert og kommunisert?'),
            jsonb_build_object('key', 'roles_clear', 'question', 'Er roller og ansvar klart definert?'),
            jsonb_build_object('key', 'objectives_set', 'question', 'Er kvalitetsmål etablert og målbare?')
          )
        ),
        jsonb_build_object(
          'title', 'Dokumentstyring',
          'items', jsonb_build_array(
            jsonb_build_object('key', 'approval_process', 'question', 'Finnes godkjenningsprosess for dokumenter?'),
            jsonb_build_object('key', 'version_control', 'question', 'Er versjonskontroll på plass?'),
            jsonb_build_object('key', 'change_log', 'question', 'Loggføres endringer med begrunnelse?')
          )
        ),
        jsonb_build_object(
          'title', 'Avvik og korrigering',
          'items', jsonb_build_array(
            jsonb_build_object('key', 'root_cause', 'question', 'Gjøres rotårsaksanalyse på alle avvik?'),
            jsonb_build_object('key', 'verification', 'question', 'Verifiseres effektivitet av tiltak?'),
            jsonb_build_object('key', 'trending', 'question', 'Analyseres trender i avvikene?')
          )
        ),
        jsonb_build_object(
          'title', 'Kompetanse',
          'items', jsonb_build_array(
            jsonb_build_object('key', 'training_records', 'question', 'Er opplæring registrert?'),
            jsonb_build_object('key', 'cert_validity', 'question', 'Følges sertifikat-utløp opp?')
          )
        )
      )
    ),
    true
  )
  on conflict do nothing;

  -- 2) Standard miljørevisjon-sjekkliste
  insert into public.audit_checklist_templates (
    organization_id, name, description, definition, is_active
  )
  values (
    p_org_id,
    'ISO 14001 internrevisjon — basis',
    'Standard sjekkliste for første internrevisjon av miljøsystemet.',
    jsonb_build_object(
      'sections', jsonb_build_array(
        jsonb_build_object(
          'title', 'Miljøaspekter',
          'items', jsonb_build_array(
            jsonb_build_object('key', 'aspects_identified', 'question', 'Er signifikante miljøaspekter identifisert?'),
            jsonb_build_object('key', 'controls_in_place', 'question', 'Er kontrolltiltak implementert for signifikante aspekter?')
          )
        ),
        jsonb_build_object(
          'title', 'Lovkrav',
          'items', jsonb_build_array(
            jsonb_build_object('key', 'compliance_register', 'question', 'Er compliance-register oppdatert?'),
            jsonb_build_object('key', 'evidence_kept', 'question', 'Er evidens for etterlevelse arkivert?')
          )
        ),
        jsonb_build_object(
          'title', 'Beredskap',
          'items', jsonb_build_array(
            jsonb_build_object('key', 'emergency_plan', 'question', 'Finnes oppdatert beredskapsplan?'),
            jsonb_build_object('key', 'drills_done', 'question', 'Er øvelser gjennomført siste 12 mnd?')
          )
        )
      )
    ),
    true
  )
  on conflict do nothing;

  -- 3) Default kvalitets- og miljømål (status proposed — kunde aktiverer/justerer)
  insert into public.iso_objectives (
    organization_id, kind, title, description, target_value, unit, deadline, status
  )
  values
    (p_org_id, 'quality', 'Reduser åpne avvik', 'Antall åpne avvik > 30 dager', '< 5', 'antall', current_date + interval '6 months', 'proposed'),
    (p_org_id, 'quality', 'Kundetilfredshet', 'Score på årlig kundeundersøkelse', '>= 80', '%', current_date + interval '12 months', 'proposed'),
    (p_org_id, 'environment', 'Reduser kjøretøyutslipp', 'Andel km på fossilfri energi', '>= 25', '%', current_date + interval '12 months', 'proposed'),
    (p_org_id, 'environment', 'Avfallssortering', 'Sorteringsgrad på byggeplass', '>= 80', '%', current_date + interval '12 months', 'proposed')
  on conflict do nothing;

  -- 4) Standard compliance-forpliktelser for norsk elektrobransje
  insert into public.compliance_obligations (
    organization_id, regulation, requirement, reference_url, status
  )
  values
    (p_org_id, 'Forskrift om sikkerhet ved arbeid i og drift av elektriske anlegg (FSE)',
     'Sikker drift og vedlikehold av elektriske installasjoner.',
     'https://lovdata.no/dokument/SF/forskrift/2006-04-28-458', 'under_review'),
    (p_org_id, 'Forskrift om elektriske lavspenningsanlegg (FEL)',
     'Prosjektering og utførelse av lavspenningsinstallasjoner.',
     'https://lovdata.no/dokument/SF/forskrift/1998-11-06-1060', 'under_review'),
    (p_org_id, 'Internkontrollforskriften',
     'Systematisk HMS-arbeid i virksomheten.',
     'https://lovdata.no/dokument/SF/forskrift/1996-12-06-1127', 'under_review'),
    (p_org_id, 'Forurensningsloven',
     'Forebygge forurensning av ytre miljø.',
     'https://lovdata.no/dokument/NL/lov/1981-03-13-6', 'under_review'),
    (p_org_id, 'Avfallsforskriften',
     'Håndtering og sortering av avfall.',
     'https://lovdata.no/dokument/SF/forskrift/2004-06-01-930', 'under_review')
  on conflict do nothing;

  -- 5) Default prosjekt-stadier (kanban-kolonner). Bedriften kan tilpasse i
  --    /admin/prosjekt-oppsett. Bare seed hvis orgen ikke allerede har egne.
  if not exists (
    select 1 from public.project_stages where organization_id = p_org_id
  ) then
    insert into public.project_stages (organization_id, name, order_index, color, is_active)
    values
      (p_org_id, 'Tilbud',            1, '#3B82F6', true),
      (p_org_id, 'Befaring',          2, '#A855F7', true),
      (p_org_id, 'Planlegging',       3, '#EAB308', true),
      (p_org_id, 'Utførelse',         4, '#F47920', true),
      (p_org_id, 'Sluttkontroll',     5, '#06B6D4', true),
      (p_org_id, 'Ferdig',            6, '#10B981', true);
  end if;

  -- 6) Default prosess-grupper. Tilpasses i /admin/grupper.
  if not exists (
    select 1 from public.groups where organization_id = p_org_id
  ) then
    insert into public.groups (organization_id, name, description, color)
    values
      (p_org_id, 'Salg',          'Salg og tilbud',            '#3B82F6'),
      (p_org_id, 'Prosjektering', 'Befaring og prosjektering', '#A855F7'),
      (p_org_id, 'Produksjon',    'Feltarbeid og installasjon','#F47920'),
      (p_org_id, 'Dokumentasjon', 'Sluttkontroll og as-built', '#06B6D4');
  end if;
end $$;

------------------------------------------------------------------
-- Backfill: alle eksisterende orgs som ikke har stages/groups får dem nå.
-- Funksjonen er idempotent, så vi kan trygt kalle den for alle.
------------------------------------------------------------------
do $$
declare
  v_org_id uuid;
begin
  for v_org_id in select id from public.organizations loop
    perform public.seed_iso_defaults_for_org(v_org_id);
  end loop;
end $$;
