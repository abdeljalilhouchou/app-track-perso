-- Strength training: exercise catalog, weekly program (session templates with exercises),
-- and per-set logging attached to the existing `workouts` sessions.

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text not null default 'Autre',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.exercises enable row level security;

drop policy if exists "Exercises are managed by owner" on public.exercises;
create policy "Exercises are managed by owner" on public.exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  muscle_groups text[] not null default '{}',
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.workout_templates enable row level security;

drop policy if exists "Workout templates are managed by owner" on public.workout_templates;
create policy "Workout templates are managed by owner" on public.workout_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  muscle_group text not null default 'Autre',
  target_sets int not null default 3,
  target_reps int not null default 10,
  position int not null default 0
);

alter table public.workout_template_exercises enable row level security;

drop policy if exists "Workout template exercises are managed by owner" on public.workout_template_exercises;
create policy "Workout template exercises are managed by owner" on public.workout_template_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.workouts add column if not exists muscle_groups text[] not null default '{}';
alter table public.workouts add column if not exists template_id uuid references public.workout_templates(id) on delete set null;

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  muscle_group text not null default 'Autre',
  exercise_position int not null default 0,
  set_number int not null default 1,
  reps int not null,
  weight_kg numeric(6, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.workout_sets enable row level security;

drop policy if exists "Workout sets are managed by owner" on public.workout_sets;
create policy "Workout sets are managed by owner" on public.workout_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists workout_sets_workout_idx on public.workout_sets (workout_id);
create index if not exists workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise_name);
create index if not exists workout_template_exercises_template_idx on public.workout_template_exercises (template_id);
