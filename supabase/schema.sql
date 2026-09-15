-- ============================================================================
-- Schema for app_track_perso : habitudes, sport, humeur
-- A executer dans l'editeur SQL de ton projet Supabase (Database > SQL Editor)
-- ============================================================================

-- Profils utilisateur (etend auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);
create policy "Profiles are editable by owner" on public.profiles
  for update using (auth.uid() = id);
create policy "Profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = id);

-- Cree automatiquement un profil a l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- Habitudes
-- ============================================================================
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '✨',
  color text not null default '#6366f1',
  category text not null default 'Général',
  target_per_week int not null default 7,
  scheduled_days smallint[] not null default '{1,2,3,4,5,6,7}',
  position int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.habits enable row level security;

create policy "Habits are managed by owner" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

alter table public.habit_logs enable row level security;

create policy "Habit logs are managed by owner" on public.habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Sport
-- ============================================================================
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  activity text not null,
  duration_minutes int not null default 30,
  intensity smallint not null default 3 check (intensity between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.workouts enable row level security;

create policy "Workouts are managed by owner" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Humeur
-- ============================================================================
create table if not exists public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  mood_score smallint not null check (mood_score between 1 and 5),
  energy_level smallint not null default 3 check (energy_level between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

alter table public.mood_entries enable row level security;

create policy "Mood entries are managed by owner" on public.mood_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Moments (activites ponctuelles, non recurrentes)
-- ============================================================================
create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  icon text not null default '⚡',
  text text not null,
  duration_minutes int,
  price numeric(10, 2),
  created_at timestamptz not null default now()
);

alter table public.moments enable row level security;

create policy "Moments are managed by owner" on public.moments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Indexes utiles pour les requetes par plage de dates
create index if not exists habit_logs_user_date_idx on public.habit_logs (user_id, log_date);
create index if not exists workouts_user_date_idx on public.workouts (user_id, workout_date);
create index if not exists mood_entries_user_date_idx on public.mood_entries (user_id, entry_date);
create index if not exists moments_user_date_idx on public.moments (user_id, entry_date);
