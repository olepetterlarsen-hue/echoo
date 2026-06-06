-- Legg til Installatør-rolle.
-- Installatør = bemyndiget person som signerer Samsvarserklæring.
--
-- VIKTIG: Denne filen må kjøres som TO separate spørringer i Supabase
-- SQL Editor. PostgreSQL tillater ikke at en ny enum-verdi brukes i samme
-- transaksjon som den ble lagt til.
--
-- Steg 1: Kjør denne først (ALENE):
alter type user_role add value if not exists 'installator';
