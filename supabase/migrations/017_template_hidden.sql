-- Admin kan skjule maler de ikke vil bruke (f.eks. RUH hvis OPCOM ikke
-- trenger den dokumenttypen). Skjulte maler vises ikke i opprett-menyer,
-- men eksisterende dokumenter beholdes og kan fortsatt vises.

alter table public.document_templates
  add column if not exists is_hidden boolean not null default false;
