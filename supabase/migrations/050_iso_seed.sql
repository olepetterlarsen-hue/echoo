-- 050_iso_seed.sql
-- Default ISO-data som hver nye org får ved opprettelse.
-- Kjøres som SECURITY DEFINER fra trigger på organizations insert,
-- så org-eieren ikke trenger spesielle rettigheter.

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
end $$;

revoke execute on function public.seed_iso_defaults_for_org(uuid)
  from public, anon;
grant execute on function public.seed_iso_defaults_for_org(uuid) to service_role;

------------------------------------------------------------------
-- Hekt seedingen på org-opprettelse: trigger på organizations
------------------------------------------------------------------
create or replace function public.trg_seed_iso_on_org_create()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_iso_defaults_for_org(new.id);
  return new;
end $$;

drop trigger if exists trg_organizations_seed_iso on public.organizations;
create trigger trg_organizations_seed_iso
  after insert on public.organizations
  for each row execute function public.trg_seed_iso_on_org_create();
