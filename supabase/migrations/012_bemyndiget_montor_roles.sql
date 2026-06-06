-- Legg til Bemyndiget og Montør som roller.
-- Bemyndiget = bemyndiget person (FEL § 12) — kan signere Samsvarserklæring.
-- Montør = lærling/hjelpearbeider (mellom Elektriker og generell HMS-bruker).
--
-- VIKTIG: Kjør de to ALTER TYPE-linjene ALENE først (kan kjøres samlet,
-- men ikke i samme spørring som policy-endringene under).

alter type user_role add value if not exists 'bemyndiget';
alter type user_role add value if not exists 'montor';
