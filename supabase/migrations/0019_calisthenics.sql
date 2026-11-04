-- Calisthenics module, additive only. Apply manually after reviewing this file.
-- Existing workouts keep a NULL discipline; no historical classification is inferred.

begin;

alter table public.workouts
  add column if not exists discipline text;

alter table public.workouts
  add constraint workouts_discipline_check
  check (discipline is null or discipline in ('general', 'strength', 'calisthenics', 'running'));

create index if not exists workouts_user_discipline_date_idx
  on public.workouts (user_id, discipline, workout_date desc);
create unique index if not exists workouts_id_user_unique_idx
  on public.workouts (id, user_id);

create table public.calisthenics_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  exercise_key text not null,
  category text not null check (category in ('push', 'pull', 'legs', 'core', 'skills', 'mobility')),
  primary_muscle text not null,
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  measurement_type text not null check (measurement_type in ('reps', 'hold', 'mixed')),
  name_fr text not null,
  name_en text not null,
  name_ar text not null,
  description_fr text not null default '',
  description_en text not null default '',
  description_ar text not null default '',
  instructions_fr text not null default '',
  instructions_en text not null default '',
  instructions_ar text not null default '',
  created_at timestamptz not null default now()
);

create unique index calisthenics_exercises_global_key_idx
  on public.calisthenics_exercises (exercise_key) where user_id is null;
create unique index calisthenics_exercises_owner_key_idx
  on public.calisthenics_exercises (user_id, exercise_key) where user_id is not null;
create index calisthenics_exercises_owner_category_idx
  on public.calisthenics_exercises (user_id, category, level);

alter table public.calisthenics_exercises enable row level security;
create policy "Calisthenics catalog is readable by owner"
  on public.calisthenics_exercises for select to authenticated
  using (user_id is null or auth.uid() = user_id);
create policy "Calisthenics exercises are managed by owner"
  on public.calisthenics_exercises for all to authenticated
  using (user_id is not null and auth.uid() = user_id)
  with check (user_id is not null and auth.uid() = user_id);

-- Shared, read-only seed catalog. Names are stored in all supported app languages.
insert into public.calisthenics_exercises
  (user_id, exercise_key, category, primary_muscle, level, measurement_type, name_fr, name_en, name_ar)
values
  (null, 'wall-push-up', 'push', 'chest', 'beginner', 'reps', 'Pompe au mur', 'Wall push-up', 'ضغط على الحائط'),
  (null, 'incline-push-up', 'push', 'chest', 'beginner', 'reps', 'Pompe inclinée', 'Incline push-up', 'ضغط مائل'),
  (null, 'push-up', 'push', 'chest', 'beginner', 'reps', 'Pompe', 'Push-up', 'ضغط'),
  (null, 'diamond-push-up', 'push', 'triceps', 'intermediate', 'reps', 'Pompe diamant', 'Diamond push-up', 'ضغط الماسي'),
  (null, 'dips', 'push', 'triceps', 'intermediate', 'reps', 'Dips', 'Dips', 'متوازي'),
  (null, 'bench-dips', 'push', 'triceps', 'beginner', 'reps', 'Dips sur banc', 'Bench dips', 'متوازي على مقعد'),
  (null, 'pike-push-up', 'push', 'shoulders', 'intermediate', 'reps', 'Pompe en piqué', 'Pike push-up', 'ضغط بايك'),
  (null, 'pseudo-planche-push-up', 'push', 'chest', 'advanced', 'reps', 'Pompe pseudo-planche', 'Pseudo planche push-up', 'ضغط شبه بلانش'),
  (null, 'dead-hang', 'pull', 'forearms', 'beginner', 'hold', 'Suspension passive', 'Dead hang', 'تعلق سلبي'),
  (null, 'scapular-pull-up', 'pull', 'back', 'beginner', 'reps', 'Traction scapulaire', 'Scapular pull-up', 'عقلة لوحيّة'),
  (null, 'assisted-pull-up', 'pull', 'back', 'beginner', 'reps', 'Traction assistée', 'Assisted pull-up', 'عقلة بمساعدة'),
  (null, 'negative-pull-up', 'pull', 'back', 'intermediate', 'reps', 'Traction négative', 'Negative pull-up', 'عقلة سلبية'),
  (null, 'pull-up', 'pull', 'back', 'intermediate', 'reps', 'Traction', 'Pull-up', 'عقلة'),
  (null, 'chin-up', 'pull', 'back', 'intermediate', 'reps', 'Traction supination', 'Chin-up', 'عقلة قبضة سفلية'),
  (null, 'australian-row', 'pull', 'back', 'beginner', 'reps', 'Rowing inversé', 'Australian row', 'سحب أفقي'),
  (null, 'bodyweight-squat', 'legs', 'quadriceps', 'beginner', 'reps', 'Squat au poids du corps', 'Bodyweight squat', 'قرفصاء بوزن الجسم'),
  (null, 'split-squat', 'legs', 'quadriceps', 'beginner', 'reps', 'Squat fendu', 'Split squat', 'قرفصاء منقسمة'),
  (null, 'walking-lunge', 'legs', 'quadriceps', 'beginner', 'reps', 'Fente marchée', 'Walking lunge', 'اندفاع أثناء المشي'),
  (null, 'bulgarian-split-squat', 'legs', 'quadriceps', 'intermediate', 'reps', 'Squat bulgare', 'Bulgarian split squat', 'قرفصاء بلغارية'),
  (null, 'calf-raise', 'legs', 'calves', 'beginner', 'reps', 'Élévation des mollets', 'Calf raise', 'رفع الساق'),
  (null, 'assisted-pistol-squat', 'legs', 'quadriceps', 'intermediate', 'reps', 'Pistol squat assisté', 'Assisted pistol squat', 'قرفصاء مسدس بمساعدة'),
  (null, 'pistol-squat', 'legs', 'quadriceps', 'advanced', 'reps', 'Pistol squat', 'Pistol squat', 'قرفصاء المسدس'),
  (null, 'plank', 'core', 'core', 'beginner', 'hold', 'Planche', 'Plank', 'بلانك'),
  (null, 'side-plank', 'core', 'core', 'beginner', 'hold', 'Planche latérale', 'Side plank', 'بلانك جانبي'),
  (null, 'hollow-body-hold', 'core', 'core', 'intermediate', 'hold', 'Hollow hold', 'Hollow body hold', 'تثبيت الجسم المجوف'),
  (null, 'hanging-knee-raise', 'core', 'core', 'beginner', 'reps', 'Relevé de genoux suspendu', 'Hanging knee raise', 'رفع الركبتين معلقاً'),
  (null, 'hanging-leg-raise', 'core', 'core', 'advanced', 'reps', 'Relevé de jambes suspendu', 'Hanging leg raise', 'رفع الساقين معلقاً'),
  (null, 'lying-leg-raise', 'core', 'core', 'beginner', 'reps', 'Relevé de jambes au sol', 'Lying leg raise', 'رفع الساقين مستلقياً'),
  (null, 'wall-handstand-hold', 'skills', 'shoulders', 'beginner', 'hold', 'Équilibre au mur', 'Handstand wall hold', 'ثبات الوقوف على اليدين على الحائط'),
  (null, 'freestanding-handstand', 'skills', 'shoulders', 'advanced', 'hold', 'Équilibre libre', 'Freestanding handstand', 'وقوف حر على اليدين'),
  (null, 'tuck-l-sit', 'skills', 'core', 'beginner', 'hold', 'L-sit groupé', 'Tuck L-Sit', 'إل-سِت مضموم'),
  (null, 'l-sit', 'skills', 'core', 'advanced', 'hold', 'L-sit', 'L-Sit', 'إل-سِت'),
  (null, 'tuck-front-lever', 'skills', 'back', 'intermediate', 'hold', 'Front lever groupé', 'Tuck front lever', 'فرونت ليفر مضموم'),
  (null, 'front-lever-progression', 'skills', 'back', 'advanced', 'hold', 'Progression front lever', 'Front lever progression', 'تدرج الفرونت ليفر'),
  (null, 'tuck-planche', 'skills', 'shoulders', 'advanced', 'hold', 'Planche groupée', 'Tuck planche', 'بلانش مضمومة'),
  (null, 'muscle-up-progression', 'skills', 'back', 'advanced', 'mixed', 'Progression muscle-up', 'Muscle-up progression', 'تدرج ماسل أب'),
  (null, 'back-lever-progression', 'skills', 'back', 'advanced', 'hold', 'Progression back lever', 'Back lever progression', 'تدرج باك ليفر'),
  (null, 'planche-progression', 'skills', 'shoulders', 'advanced', 'hold', 'Progression planche', 'Planche progression', 'تدرج البلانش'),
  (null, 'wrist-mobility', 'mobility', 'wrists', 'beginner', 'hold', 'Mobilité des poignets', 'Wrist mobility', 'مرونة المعصم'),
  (null, 'shoulder-mobility', 'mobility', 'shoulders', 'beginner', 'hold', 'Mobilité des épaules', 'Shoulder mobility', 'مرونة الكتف'),
  (null, 'hip-mobility', 'mobility', 'hips', 'beginner', 'hold', 'Mobilité des hanches', 'Hip mobility', 'مرونة الورك')
on conflict do nothing;

create table public.calisthenics_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
alter table public.calisthenics_programs enable row level security;
create policy "Calisthenics programs are managed by owner" on public.calisthenics_programs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index calisthenics_programs_owner_idx
  on public.calisthenics_programs (user_id, updated_at desc);

create table public.calisthenics_program_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null,
  name text not null check (char_length(name) between 1 and 80),
  position int not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (program_id, user_id) references public.calisthenics_programs(id, user_id) on delete cascade
);
alter table public.calisthenics_program_sessions enable row level security;
create policy "Calisthenics program sessions are managed by owner" on public.calisthenics_program_sessions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index calisthenics_program_sessions_owner_idx
  on public.calisthenics_program_sessions (user_id, program_id, position);

create table public.calisthenics_program_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_session_id uuid not null,
  exercise_id uuid references public.calisthenics_exercises(id) on delete set null,
  exercise_name text not null,
  category text not null check (category in ('push', 'pull', 'legs', 'core', 'skills', 'mobility')),
  measurement_type text not null check (measurement_type in ('reps', 'hold', 'mixed')),
  target_sets int not null check (target_sets between 1 and 20),
  target_reps int check (target_reps between 1 and 500),
  target_hold_seconds int check (target_hold_seconds between 1 and 7200),
  assistance_kg numeric(7,2) check (assistance_kg is null or assistance_kg between 0 and 1000),
  added_weight_kg numeric(7,2) check (added_weight_kg is null or added_weight_kg between 0 and 1000),
  notes text not null default '',
  position int not null default 0 check (position >= 0),
  foreign key (program_session_id, user_id) references public.calisthenics_program_sessions(id, user_id) on delete cascade,
  unique (program_session_id, position) deferrable initially deferred,
  check ((measurement_type = 'reps' and target_reps is not null and target_hold_seconds is null)
      or (measurement_type = 'hold' and target_hold_seconds is not null and target_reps is null)
      or (measurement_type = 'mixed' and num_nonnulls(target_reps, target_hold_seconds) = 1))
);
alter table public.calisthenics_program_exercises enable row level security;
create policy "Calisthenics program exercises are managed by owner" on public.calisthenics_program_exercises
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index calisthenics_program_exercises_session_idx
  on public.calisthenics_program_exercises (user_id, program_session_id, position);

create table public.calisthenics_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid not null,
  exercise_id uuid references public.calisthenics_exercises(id) on delete set null,
  exercise_name text not null,
  category text not null check (category in ('push', 'pull', 'legs', 'core', 'skills', 'mobility')),
  measurement_type text not null check (measurement_type in ('reps', 'hold', 'mixed')),
  exercise_position int not null default 0 check (exercise_position >= 0),
  set_number int not null check (set_number between 1 and 100),
  reps int check (reps between 1 and 500),
  hold_seconds int check (hold_seconds between 1 and 7200),
  assistance_kg numeric(7,2) check (assistance_kg is null or assistance_kg between 0 and 1000),
  added_weight_kg numeric(7,2) check (added_weight_kg is null or added_weight_kg between 0 and 1000),
  variation text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  foreign key (workout_id, user_id) references public.workouts(id, user_id) on delete cascade,
  unique (workout_id, exercise_position, set_number),
  check ((measurement_type = 'reps' and reps is not null and hold_seconds is null)
      or (measurement_type = 'hold' and hold_seconds is not null and reps is null)
      or (measurement_type = 'mixed' and num_nonnulls(reps, hold_seconds) = 1))
);
alter table public.calisthenics_sets enable row level security;
create policy "Calisthenics sets are managed by owner" on public.calisthenics_sets
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index calisthenics_sets_owner_workout_idx on public.calisthenics_sets (user_id, workout_id, exercise_position, set_number);
create index calisthenics_sets_owner_exercise_idx on public.calisthenics_sets (user_id, exercise_id, created_at desc);

-- A catalog item can be shared or owned by the same user as its reference.
create function public.check_calisthenics_exercise_owner() returns trigger
language plpgsql set search_path = public as $$
declare
  catalog_owner uuid;
begin
  if new.exercise_id is null then return new; end if;
  select user_id into catalog_owner from public.calisthenics_exercises where id = new.exercise_id;
  if not found or (catalog_owner is not null and catalog_owner is distinct from new.user_id) then
    raise exception 'Calisthenics exercise is not available to this user';
  end if;
  return new;
end;
$$;
create trigger calisthenics_program_exercise_owner_check
  before insert or update of exercise_id, user_id on public.calisthenics_program_exercises
  for each row execute function public.check_calisthenics_exercise_owner();
create trigger calisthenics_set_exercise_owner_check
  before insert or update of exercise_id, user_id on public.calisthenics_sets
  for each row execute function public.check_calisthenics_exercise_owner();

create function public.check_calisthenics_workout_owner() returns trigger
language plpgsql set search_path = public as $$
declare
  workout_owner uuid;
  workout_discipline text;
begin
  select user_id, discipline into workout_owner, workout_discipline
    from public.workouts where id = new.workout_id;
  if not found or workout_owner is distinct from new.user_id or workout_discipline is distinct from 'calisthenics' then
    raise exception 'Calisthenics sets require an owned Calisthenics workout';
  end if;
  return new;
end;
$$;
create trigger calisthenics_set_workout_owner_check
  before insert or update of workout_id, user_id on public.calisthenics_sets
  for each row execute function public.check_calisthenics_workout_owner();

alter table public.workouts add column calisthenics_program_session_id uuid
  references public.calisthenics_program_sessions(id) on delete set null;

create function public.check_calisthenics_program_session_owner() returns trigger
language plpgsql set search_path = public as $$
declare
  session_owner uuid;
begin
  if new.calisthenics_program_session_id is null then return new; end if;
  select user_id into session_owner from public.calisthenics_program_sessions
    where id = new.calisthenics_program_session_id;
  if not found or session_owner is distinct from new.user_id then
    raise exception 'Calisthenics program session is not owned by this user';
  end if;
  if new.discipline is distinct from 'calisthenics' then
    raise exception 'A program session requires Calisthenics discipline';
  end if;
  return new;
end;
$$;
create trigger calisthenics_workout_program_owner_check
  before insert or update of calisthenics_program_session_id, user_id, discipline on public.workouts
  for each row execute function public.check_calisthenics_program_session_owner();

create table public.calisthenics_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  skill_key text not null default 'custom',
  current_step int not null default 0 check (current_step >= 0),
  target_step int not null default 1 check (target_step >= 1),
  progression_steps text[] not null default '{}',
  measurement_type text not null default 'hold' check (measurement_type in ('reps', 'hold')),
  started_on date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (cardinality(progression_steps) <= 30),
  check (target_step <= greatest(cardinality(progression_steps), 1)),
  check (current_step <= cardinality(progression_steps))
);
alter table public.calisthenics_skills enable row level security;
create policy "Calisthenics skills are managed by owner" on public.calisthenics_skills
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index calisthenics_skills_owner_idx on public.calisthenics_skills (user_id, updated_at desc);

create table public.calisthenics_skill_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null,
  workout_id uuid references public.workouts(id) on delete set null,
  logged_on date not null,
  step_index int not null check (step_index >= 0),
  step_name text not null,
  reps int check (reps between 1 and 500),
  hold_seconds int check (hold_seconds between 1 and 7200),
  notes text not null default '',
  created_at timestamptz not null default now(),
  foreign key (skill_id, user_id) references public.calisthenics_skills(id, user_id) on delete cascade,
  check (num_nonnulls(reps, hold_seconds) = 1)
);
alter table public.calisthenics_skill_logs enable row level security;
create policy "Calisthenics skill logs are managed by owner" on public.calisthenics_skill_logs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index calisthenics_skill_logs_owner_skill_date_idx
  on public.calisthenics_skill_logs (user_id, skill_id, logged_on desc, id);

-- Authenticated users get CRUD privileges; RLS limits rows to their own data.
revoke all on table
  public.calisthenics_exercises,
  public.calisthenics_programs,
  public.calisthenics_program_sessions,
  public.calisthenics_program_exercises,
  public.calisthenics_sets,
  public.calisthenics_skills,
  public.calisthenics_skill_logs
from public, anon, service_role;
grant select, insert, update, delete on table
  public.calisthenics_exercises,
  public.calisthenics_programs,
  public.calisthenics_program_sessions,
  public.calisthenics_program_exercises,
  public.calisthenics_sets,
  public.calisthenics_skills,
  public.calisthenics_skill_logs
to authenticated;

create function public.check_calisthenics_skill_log_workout_owner() returns trigger
language plpgsql set search_path = public as $$
declare
  skill_measurement text;
  skill_progression_steps text[];
  workout_owner uuid;
  workout_discipline text;
begin
  select measurement_type, progression_steps into skill_measurement, skill_progression_steps
    from public.calisthenics_skills
    where id = new.skill_id and user_id = new.user_id;
  if not found or new.step_index >= cardinality(skill_progression_steps) then
    raise exception 'Calisthenics skill step is not available to this user';
  end if;
  if (skill_measurement = 'reps' and (new.reps is null or new.hold_seconds is not null))
    or (skill_measurement = 'hold' and (new.hold_seconds is null or new.reps is not null)) then
    raise exception 'Calisthenics skill log measurement does not match the skill';
  end if;
  if new.workout_id is null then return new; end if;
  select user_id, discipline into workout_owner, workout_discipline
    from public.workouts where id = new.workout_id;
  if not found or workout_owner is distinct from new.user_id or workout_discipline is distinct from 'calisthenics' then
    raise exception 'Calisthenics skill log requires an owned Calisthenics workout';
  end if;
  return new;
end;
$$;
create trigger calisthenics_skill_log_workout_owner_check
  before insert or update of skill_id, user_id, step_index, reps, hold_seconds, workout_id on public.calisthenics_skill_logs
  for each row execute function public.check_calisthenics_skill_log_workout_owner();

create function public.prevent_reclassifying_calisthenics_workout() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Workout ownership cannot be changed';
  end if;
  if new.discipline is distinct from 'calisthenics'
    and (
      exists (
        select 1 from public.calisthenics_sets
        where workout_id = old.id and user_id = old.user_id
      )
      or exists (
        select 1 from public.calisthenics_skill_logs
        where workout_id = old.id and user_id = old.user_id
      )
    ) then
    raise exception 'A workout with Calisthenics data must keep its discipline';
  end if;
  return new;
end;
$$;
create trigger calisthenics_workout_discipline_guard
  before update of discipline, user_id on public.workouts
  for each row execute function public.prevent_reclassifying_calisthenics_workout();

-- A single RPC keeps program creation and edits atomic, including reordering.
create function public.save_calisthenics_program(
  p_program_id uuid,
  p_name text,
  p_notes text,
  p_sessions jsonb
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_program_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_notes text := coalesce(p_notes, '');
  v_session jsonb;
  v_exercise jsonb;
  v_catalog public.calisthenics_exercises%rowtype;
  v_session_id uuid;
  v_requested_session_id uuid;
  v_exercise_id uuid;
  v_requested_exercise_id uuid;
  v_session_position integer := 0;
  v_exercise_position integer;
  v_session_count integer;
  v_exercise_count integer;
  v_total_exercises integer := 0;
  v_retained_sessions uuid[] := array[]::uuid[];
  v_retained_exercises uuid[];
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if char_length(v_name) not between 1 and 80 or char_length(v_notes) > 2000 then
    raise exception 'Invalid program name or notes' using errcode = '22023';
  end if;
  if p_sessions is null or jsonb_typeof(p_sessions) is distinct from 'array' then
    raise exception 'Program sessions must be an array' using errcode = '22023';
  end if;

  v_session_count := jsonb_array_length(p_sessions);
  if v_session_count not between 1 and 20 then
    raise exception 'Program must contain between 1 and 20 sessions' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_sessions) as s(value)
    where nullif(s.value ->> 'id', '') is not null
    group by (s.value ->> 'id')::uuid having count(*) > 1
  ) then
    raise exception 'Duplicate program session id' using errcode = '22023';
  end if;

  for v_session in select value from jsonb_array_elements(p_sessions) as sessions(value) loop
    if jsonb_typeof(v_session) is distinct from 'object'
      or char_length(btrim(coalesce(v_session ->> 'name', ''))) not between 1 and 80
      or jsonb_typeof(v_session -> 'exercises') is distinct from 'array' then
      raise exception 'Invalid program session' using errcode = '22023';
    end if;
    v_exercise_count := jsonb_array_length(v_session -> 'exercises');
    if v_exercise_count not between 1 and 50 then
      raise exception 'Each session must contain between 1 and 50 exercises' using errcode = '22023';
    end if;
    v_total_exercises := v_total_exercises + v_exercise_count;
    if v_total_exercises > 200 then
      raise exception 'Program contains too many exercises' using errcode = '22023';
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_array_elements(p_sessions) with ordinality as s(value, session_order)
    cross join lateral jsonb_array_elements(s.value -> 'exercises') as e(value)
    where nullif(e.value ->> 'id', '') is not null
    group by s.session_order, (e.value ->> 'id')::uuid having count(*) > 1
  ) then
    raise exception 'Duplicate program exercise id within a session' using errcode = '22023';
  end if;

  if p_program_id is null then
    insert into public.calisthenics_programs (user_id, name, notes)
    values (v_user_id, v_name, v_notes) returning id into v_program_id;
  else
    select id into v_program_id from public.calisthenics_programs
    where id = p_program_id and user_id = v_user_id for update;
    if not found then
      raise exception 'Program not found' using errcode = 'P0002';
    end if;
    update public.calisthenics_programs
    set name = v_name, notes = v_notes, updated_at = now()
    where id = v_program_id and user_id = v_user_id;
  end if;

  for v_session in select value from jsonb_array_elements(p_sessions) as sessions(value) loop
    v_requested_session_id := nullif(v_session ->> 'id', '')::uuid;
    if v_requested_session_id is null then
      insert into public.calisthenics_program_sessions (user_id, program_id, name, position)
      values (v_user_id, v_program_id, btrim(v_session ->> 'name'), v_session_position)
      returning id into v_session_id;
    else
      update public.calisthenics_program_sessions
      set name = btrim(v_session ->> 'name'), position = v_session_position
      where id = v_requested_session_id and program_id = v_program_id and user_id = v_user_id
      returning id into v_session_id;
      if not found then
        raise exception 'Program session is not owned by this program' using errcode = '42501';
      end if;
    end if;

    v_retained_sessions := array_append(v_retained_sessions, v_session_id);
    v_retained_exercises := array[]::uuid[];
    v_exercise_position := 0;
    for v_exercise in select value from jsonb_array_elements(v_session -> 'exercises') as exercises(value) loop
      if jsonb_typeof(v_exercise) is distinct from 'object'
        or char_length(coalesce(v_exercise ->> 'notes', '')) > 500 then
        raise exception 'Invalid program exercise' using errcode = '22023';
      end if;
      v_requested_exercise_id := nullif(v_exercise ->> 'exerciseId', '')::uuid;
      if v_requested_exercise_id is null then
        raise exception 'Exercise id is required' using errcode = '22023';
      end if;
      select * into v_catalog from public.calisthenics_exercises
      where id = v_requested_exercise_id and (user_id is null or user_id = v_user_id);
      if not found then
        raise exception 'Exercise is not available to this user' using errcode = '42501';
      end if;

      v_requested_exercise_id := nullif(v_exercise ->> 'id', '')::uuid;
      if v_requested_exercise_id is null then
        insert into public.calisthenics_program_exercises (
          user_id, program_session_id, exercise_id, exercise_name, category, measurement_type,
          target_sets, target_reps, target_hold_seconds, assistance_kg, added_weight_kg, notes, position
        ) values (
          v_user_id, v_session_id, v_catalog.id, v_catalog.name_fr, v_catalog.category, v_catalog.measurement_type,
          (v_exercise ->> 'targetSets')::integer,
          nullif(v_exercise ->> 'targetReps', '')::integer,
          nullif(v_exercise ->> 'targetHoldSeconds', '')::integer,
          nullif(v_exercise ->> 'assistanceKg', '')::numeric,
          nullif(v_exercise ->> 'addedWeightKg', '')::numeric,
          coalesce(v_exercise ->> 'notes', ''), v_exercise_position
        ) returning id into v_exercise_id;
      else
        update public.calisthenics_program_exercises
        set exercise_id = v_catalog.id, exercise_name = v_catalog.name_fr,
            category = v_catalog.category, measurement_type = v_catalog.measurement_type,
            target_sets = (v_exercise ->> 'targetSets')::integer,
            target_reps = nullif(v_exercise ->> 'targetReps', '')::integer,
            target_hold_seconds = nullif(v_exercise ->> 'targetHoldSeconds', '')::integer,
            assistance_kg = nullif(v_exercise ->> 'assistanceKg', '')::numeric,
            added_weight_kg = nullif(v_exercise ->> 'addedWeightKg', '')::numeric,
            notes = coalesce(v_exercise ->> 'notes', ''), position = v_exercise_position
        where id = v_requested_exercise_id and program_session_id = v_session_id and user_id = v_user_id
        returning id into v_exercise_id;
        if not found then
          raise exception 'Program exercise is not owned by this session' using errcode = '42501';
        end if;
      end if;
      v_retained_exercises := array_append(v_retained_exercises, v_exercise_id);
      v_exercise_position := v_exercise_position + 1;
    end loop;

    delete from public.calisthenics_program_exercises
    where program_session_id = v_session_id and user_id = v_user_id
      and not (id = any(v_retained_exercises));
    v_session_position := v_session_position + 1;
  end loop;

  delete from public.calisthenics_program_sessions
  where program_id = v_program_id and user_id = v_user_id
    and not (id = any(v_retained_sessions));
  return v_program_id;
end;
$$;

revoke all on function public.save_calisthenics_program(uuid, text, text, jsonb) from public, anon, service_role;
grant execute on function public.save_calisthenics_program(uuid, text, text, jsonb) to authenticated;

commit;
