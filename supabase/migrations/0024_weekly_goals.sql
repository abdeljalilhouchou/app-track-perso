-- Weekly review: the one goal chosen for a week (keyed by its Monday), checked in the
-- next review. The goal is a stable key and a whole-number target; the app translates it.
-- Additive only: review and apply manually.

begin;

create table if not exists public.weekly_goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  goal_key text not null check (goal_key in ('bedtime', 'sleep7', 'protein', 'sport', 'habits', 'moodDaily')),
  target integer not null check (target between 1 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.weekly_goals enable row level security;

drop policy if exists "weekly_goals_owner" on public.weekly_goals;
create policy "weekly_goals_owner" on public.weekly_goals
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

commit;
