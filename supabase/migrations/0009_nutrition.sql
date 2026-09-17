-- Nutrition tracking: food diary with auto-computed macros, plus a
-- calculator (height/weight/age/sex/activity/goal) that derives daily targets.

alter table public.profiles add column if not exists height_cm numeric(5, 1);
alter table public.profiles add column if not exists weight_kg numeric(5, 1);
alter table public.profiles add column if not exists age int;
alter table public.profiles add column if not exists sex text check (sex in ('homme', 'femme'));
alter table public.profiles add column if not exists activity_level text
  check (activity_level in ('sedentaire', 'leger', 'modere', 'actif', 'tres_actif'));
alter table public.profiles add column if not exists nutrition_goal text
  check (nutrition_goal in ('perdre', 'maintenir', 'prendre'));

alter table public.profiles add column if not exists goal_calories int;
alter table public.profiles add column if not exists goal_protein numeric(6, 1);
alter table public.profiles add column if not exists goal_carbs numeric(6, 1);
alter table public.profiles add column if not exists goal_fat numeric(6, 1);

create table if not exists public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  occurred_at timestamptz not null default now(),
  meal_type text not null default 'autre' check (meal_type in ('petit-dejeuner', 'dejeuner', 'diner', 'collation', 'autre')),
  food_name text not null,
  icon text not null default '🍽️',
  quantity_grams numeric(7, 1) not null,
  calories numeric(7, 1) not null,
  protein numeric(6, 1) not null default 0,
  carbs numeric(6, 1) not null default 0,
  fat numeric(6, 1) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.meal_entries enable row level security;

create policy "Meal entries are managed by owner" on public.meal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists meal_entries_user_date_idx on public.meal_entries (user_id, entry_date);
