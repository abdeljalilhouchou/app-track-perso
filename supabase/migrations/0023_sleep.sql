-- Sleep: one row per night, keyed by the morning you woke up. Bedtime and wake time are
-- local clock times; the duration is stored as given by the app (it crosses midnight).
-- Habits can now be checked automatically by a night in bed before midnight
-- (auto_source 'sleep'). Additive only: review and apply manually.

begin;

create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wake_date date not null,
  bedtime time not null,
  wake_time time not null,
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  quality smallint not null check (quality between 1 and 5),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, wake_date)
);

create index if not exists sleep_logs_user_date_idx on public.sleep_logs (user_id, wake_date desc);

alter table public.sleep_logs enable row level security;

drop policy if exists "sleep_logs_owner" on public.sleep_logs;
create policy "sleep_logs_owner" on public.sleep_logs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.habits drop constraint if exists habits_auto_source_check;
alter table public.habits add constraint habits_auto_source_check check (auto_source is null or auto_source in ('sport', 'water', 'mood', 'sleep'));

commit;
