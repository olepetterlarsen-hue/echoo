-- OPControl: kunder som egen entitet (separat fra prosjekter).
-- En kunde kan ha mange sites og mange prosjekter.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_number text,
  contact_person text,
  email text,
  phone text,
  address text,
  postal_code text,
  city text,
  notes text,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_name on public.customers(name);
create index if not exists idx_customers_active on public.customers(active);

do $$ begin
  create trigger trg_customers_updated before update on public.customers
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.customers enable row level security;

drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
  for select using (public.is_active());

drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
  for insert with check (public.is_active() and created_by = auth.uid());

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
      or created_by = auth.uid()
    )
  );

drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers
  for delete using (public.is_admin());
