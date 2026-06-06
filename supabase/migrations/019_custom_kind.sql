-- Legg til 'custom' som dokumenttype for egendefinerte maler.
-- VIKTIG: Kjør ALENE.

alter type document_kind add value if not exists 'custom';
