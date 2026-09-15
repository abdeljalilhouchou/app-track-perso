-- Daily reminder notifications: one chosen time per user, sent if scheduled
-- habits are still unchecked that day.

alter table public.profiles add column if not exists reminder_time text;
alter table public.profiles add column if not exists reminder_timezone text;
alter table public.profiles add column if not exists reminded_date date;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Push subscriptions are managed by owner" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
