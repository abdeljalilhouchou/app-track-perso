-- Push notifications on the phone (installed web app): the devices that accept them,
-- what each person wants to receive and when, and what was already sent today so a
-- notification never goes out twice. Additive only: review and apply manually.
-- The 15-minute schedule that triggers the sending is set up separately (it needs a secret).

begin;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_subscriptions_owner" on public.push_subscriptions;
create policy "push_subscriptions_owner" on public.push_subscriptions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  timezone text not null default 'Europe/Paris' check (char_length(timezone) <= 64),
  kinds jsonb not null default '{}'::jsonb,
  quiet_on boolean not null default true,
  quiet_from text not null default '22:30' check (quiet_from ~ '^[0-2][0-9]:[0-5][0-9]$'),
  quiet_to text not null default '07:30' check (quiet_to ~ '^[0-2][0-9]:[0-5][0-9]$'),
  cap_on boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_settings enable row level security;
drop policy if exists "notification_settings_owner" on public.notification_settings;
create policy "notification_settings_owner" on public.notification_settings
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Written by the server only; people can read their own.
create table if not exists public.notification_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('habits', 'streak', 'mood', 'sleep', 'water', 'review', 'test')),
  local_date date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, local_date)
);
alter table public.notification_log enable row level security;
drop policy if exists "notification_log_read_own" on public.notification_log;
create policy "notification_log_read_own" on public.notification_log
  for select to authenticated using (auth.uid() = user_id);

commit;
