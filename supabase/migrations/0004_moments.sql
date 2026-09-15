-- Ad-hoc, non-recurring day journal entries (e.g. "Café avec Sarah", "Shopping")
-- Distinct from habits: no schedule, no streak, just a quick timestamped note.

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  icon text not null default '⚡',
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.moments enable row level security;

create policy "Moments are managed by owner" on public.moments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists moments_user_date_idx on public.moments (user_id, entry_date);
