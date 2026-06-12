-- 041_handle_new_user_org.sql
-- Fix Phase 1.2: handle_new_user() trigger glemte å sette organization_id.
-- Det betyr at brukere invitert av admin (via auth.admin.createUser) endte
-- opp uten organisasjon og kunne ikke se noe data.
--
-- Strategi: server action setter user_metadata.organization_id når admin
-- inviterer, og trigger leser det her. Ingen organization_id i metadata
-- (= public signup-flyten) gjør at vi lar profile.organization_id stå
-- null — signup_organization() RPC fyller den inn etterpå.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_full_name text;
  v_org_id uuid;
begin
  v_role := coalesce(
    (new.raw_user_meta_data->>'role')::user_role,
    'elektriker'::user_role
  );
  v_full_name := new.raw_user_meta_data->>'full_name';

  -- organization_id kan settes av admin-invite-flyten via user_metadata.
  -- Hvis ikke, lar vi det stå NULL — signup_organization() RPC fyller
  -- inn for public signup, eller admin må sette explicit etterpå.
  begin
    v_org_id := nullif(new.raw_user_meta_data->>'organization_id', '')::uuid;
  exception when invalid_text_representation then
    v_org_id := null;
  end;

  insert into public.profiles (id, email, full_name, role, organization_id)
  values (new.id, new.email, v_full_name, v_role, v_org_id)
  on conflict (id) do nothing;

  return new;
end $$;

comment on function public.handle_new_user is
  'Trigger på auth.users insert. Leser raw_user_meta_data: full_name, role, '
  'organization_id. organization_id fra admin-invite-flyt — public signup '
  'lar den stå NULL og fyller via signup_organization() RPC etterpå.';
