-- Run this in your Supabase SQL editor

create table if not exists concession_items (
  id uuid primary key default gen_random_uuid(),
  cinema_id uuid not null,
  name text not null,
  price numeric(10,2) not null default 0,
  category text not null default 'Other',
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists concession_items_cinema_id_idx on concession_items(cinema_id);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  cinema_id uuid not null,
  created_at timestamptz not null default now(),
  items jsonb not null default '[]',
  total numeric(10,2) not null default 0
);

create index if not exists transactions_cinema_id_idx on transactions(cinema_id);
create index if not exists transactions_created_at_idx on transactions(created_at);

-- Enable RLS (adjust policies to your needs)
alter table concession_items enable row level security;
alter table transactions enable row level security;

-- Allow all operations for anon key (tighten in production)
create policy "allow all concession_items" on concession_items for all using (true) with check (true);
create policy "allow all transactions" on transactions for all using (true) with check (true);
