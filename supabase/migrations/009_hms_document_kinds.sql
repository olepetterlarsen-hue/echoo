-- Legg til HMS-dokumenttyper: RUH, Startup checklist, Stikkprøvekontroll.
-- VIKTIG: Kjør hver ALTER TYPE-spørring ALENE (PostgreSQL tillater ikke
-- ny enum-verdi i samme transaksjon som den brukes).
--
-- Steg 1: Kjør disse linjene ALENE (én linje av gangen er sikrest):

alter type document_kind add value if not exists 'ruh';
alter type document_kind add value if not exists 'startup_checklist';
alter type document_kind add value if not exists 'stikkprovekontroll';
