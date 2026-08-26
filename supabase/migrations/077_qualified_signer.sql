-- 077_qualified_signer.sql
-- B5/F-14: skiller systemrolle (role) fra faglig kvalifikasjon. En admin er
-- ikke nødvendigvis installatør/bemyndiget (og skal IKKE automatisk kunne
-- signere samsvarserklæringer bare i kraft av å være admin — det ble
-- bevisst fjernet 2026-06-26). Men i et enmannsforetak ER admin ofte også
-- den faktiske bemyndigede personen. qualified_signer lar den som
-- registrerer bedriften krysse av for dette selv, uten å endre den
-- systemrollen som styrer admin-panel-tilgang.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS qualified_signer boolean NOT NULL DEFAULT false;
