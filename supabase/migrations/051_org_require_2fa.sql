-- 051_org_require_2fa.sql
-- ISO 27001 A.9.4.2 / NSM 5.1: påkrev to-faktor for admin-tilgang.
-- Org-eier kan slå på "require 2FA" i /admin/bedrift. Når den er på
-- må alle brukere enrolle en TOTP-faktor og logge inn med aal2 før
-- de får tilgang.
--
-- Vi lagrer kun preferansen her. Selve faktorene ligger i
-- auth.mfa_factors (Supabase native) og er managed via auth.mfa.* API.

alter table public.organizations
  add column if not exists require_2fa boolean not null default false;

comment on column public.organizations.require_2fa is
  'Når true: alle brukere i organisasjonen må enrolle TOTP og '
  'autentisere med aal2 før de får app-tilgang. Håndheves i (app)/layout.';
