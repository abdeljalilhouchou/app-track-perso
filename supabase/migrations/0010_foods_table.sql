-- Personal, editable food database (replaces the static curated list as the
-- source of truth once seeded) so users can add/edit/delete entries.

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '🍽️',
  category text not null default 'Autres',
  calories numeric(6, 1) not null default 0,
  protein numeric(6, 1) not null default 0,
  carbs numeric(6, 1) not null default 0,
  fat numeric(6, 1) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.foods enable row level security;

create policy "Foods are managed by owner" on public.foods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists foods_user_idx on public.foods (user_id);
