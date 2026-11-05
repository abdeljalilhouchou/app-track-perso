-- Track Perso 2.0 Running module. Additive only; review and apply manually.
-- Requires migration 0019 (workouts.discipline and workouts_id_user_unique_idx).
-- Existing workouts are deliberately left untouched and are never backfilled.

begin;

do $$
begin
  if to_regclass('public.workouts') is null
    or to_regclass('public.workouts_id_user_unique_idx') is null
    or exists (
      select required.column_name
      from (values ('id'), ('user_id'), ('workout_date'), ('activity'), ('duration_minutes'), ('intensity'), ('notes'), ('discipline')) as required(column_name)
      where not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'workouts' and column_name = required.column_name
      )
    )
    or not exists (
      select 1 from pg_catalog.pg_index as i
      where i.indexrelid = to_regclass('public.workouts_id_user_unique_idx')
        and i.indrelid = to_regclass('public.workouts')
        and i.indisunique and i.indisvalid and i.indpred is null
        and i.indnkeyatts = 2 and i.indnatts = 2
        and (
          select array_agg(a.attname order by k.ordinality)
          from unnest(i.indkey::smallint[]) with ordinality as k(attnum, ordinality)
          join pg_catalog.pg_attribute as a on a.attrelid = i.indrelid and a.attnum = k.attnum
        ) = array['id'::name, 'user_id'::name]
    )
    or not exists (
      select 1 from pg_catalog.pg_constraint as c
      where c.conrelid = to_regclass('public.workouts') and c.conname = 'workouts_discipline_check'
        and pg_catalog.pg_get_constraintdef(c.oid) like '%running%'
    ) then
    raise exception 'Running migration requires the versioned workouts schema and migration 0019';
  end if;
end;
$$;

create table public.running_sessions (
  workout_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 100),
  run_type text not null check (run_type in ('easy', 'endurance', 'long', 'tempo', 'interval', 'recovery', 'free', 'race')),
  distance_km numeric(8, 3) not null check (distance_km between 0.001 and 1000),
  duration_seconds integer not null check (duration_seconds between 1 and 604800),
  elevation_gain_m integer check (elevation_gain_m is null or elevation_gain_m between 0 and 100000),
  average_heart_rate integer check (average_heart_rate is null or average_heart_rate between 30 and 250),
  cadence_spm integer check (cadence_spm is null or cadence_spm between 1 and 300),
  created_at timestamptz not null default now(),
  foreign key (workout_id, user_id) references public.workouts(id, user_id) on delete cascade
);

create index running_sessions_owner_workout_idx
  on public.running_sessions (user_id, workout_id);
create index running_sessions_owner_type_idx
  on public.running_sessions (user_id, run_type);

create table public.running_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_distance_km numeric(8, 2) check (weekly_distance_km is null or weekly_distance_km between 0.01 and 1000),
  weekly_runs integer check (weekly_runs is null or weekly_runs between 1 and 14),
  monthly_distance_km numeric(8, 2) check (monthly_distance_km is null or monthly_distance_km between 0.01 and 5000),
  target_5k_seconds integer check (target_5k_seconds is null or target_5k_seconds between 1 and 86400),
  target_10k_seconds integer check (target_10k_seconds is null or target_10k_seconds between 1 and 86400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(weekly_distance_km, weekly_runs, monthly_distance_km, target_5k_seconds, target_10k_seconds) > 0)
);

alter table public.running_sessions enable row level security;
alter table public.running_goals enable row level security;

create policy "Running sessions are managed by owner" on public.running_sessions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Running goals are managed by owner" on public.running_goals
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on table public.running_sessions, public.running_goals from public, anon, service_role;
grant select, insert, update on table public.running_sessions to authenticated;
grant select, insert, update, delete on table public.running_goals to authenticated;

create function public.check_running_session_workout_owner() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare
  workout_owner uuid;
  workout_discipline text;
begin
  select w.user_id, w.discipline into workout_owner, workout_discipline
  from public.workouts as w
  where w.id = new.workout_id
  for key share;
  if not found or workout_owner is distinct from new.user_id or workout_discipline is distinct from 'running' then
    raise exception 'Running details require an owned Running workout';
  end if;
  return new;
end;
$$;

create trigger running_session_workout_owner_check
  before insert or update on public.running_sessions
  for each row execute function public.check_running_session_workout_owner();

create function public.prevent_reclassifying_running_workout() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.user_id is distinct from old.user_id
    and exists (select 1 from public.running_sessions where workout_id = old.id) then
    raise exception 'A workout with Running data cannot change owner';
  end if;
  if new.discipline is distinct from 'running'
    and exists (
      select 1 from public.running_sessions
      where workout_id = old.id and user_id = old.user_id
    ) then
    raise exception 'A workout with Running data must keep its discipline';
  end if;
  return new;
end;
$$;

create trigger running_workout_discipline_guard
  before update of discipline, user_id on public.workouts
  for each row execute function public.prevent_reclassifying_running_workout();

-- A workout classified as Running must have details by transaction end. This permits the
-- RPC to create both rows atomically while preventing incomplete direct inserts/reclassifications.
create function public.require_running_session_details() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.discipline = 'running' and not exists (
    select 1 from public.running_sessions
    where workout_id = new.id and user_id = new.user_id
  ) then
    raise exception 'A Running workout requires Running session details';
  end if;
  return null;
end;
$$;

create constraint trigger running_workout_requires_details
  after insert or update on public.workouts
  deferrable initially deferred
  for each row execute function public.require_running_session_details();

create function public.prevent_running_session_relink() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.workout_id is distinct from old.workout_id or new.user_id is distinct from old.user_id then
    raise exception 'Running session ownership and workout link are immutable';
  end if;
  return new;
end;
$$;

create trigger running_session_link_guard
  before update of workout_id, user_id on public.running_sessions
  for each row execute function public.prevent_running_session_relink();

create function public.save_running_session(
  p_workout_id uuid,
  p_workout_date date,
  p_name text,
  p_run_type text,
  p_distance_km numeric,
  p_duration_seconds integer,
  p_intensity integer,
  p_notes text,
  p_elevation_gain_m integer,
  p_average_heart_rate integer,
  p_cadence_spm integer
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_workout_id uuid;
  v_existing_discipline text;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_workout_date is null or p_workout_date > current_date
    or p_name is null or char_length(p_name) > 100
    or p_notes is null or char_length(p_notes) > 2000
    or p_run_type is null or p_run_type not in ('easy', 'endurance', 'long', 'tempo', 'interval', 'recovery', 'free', 'race')
    or p_distance_km is null or p_distance_km not between 0.001 and 1000 or p_distance_km <> round(p_distance_km, 3)
    or p_duration_seconds is null or p_duration_seconds not between 1 and 604800
    or p_intensity is null or p_intensity not between 1 and 5
    or (p_elevation_gain_m is not null and p_elevation_gain_m not between 0 and 100000)
    or (p_average_heart_rate is not null and p_average_heart_rate not between 30 and 250)
    or (p_cadence_spm is not null and p_cadence_spm not between 1 and 300) then
    raise exception 'Invalid Running session values' using errcode = '22023';
  end if;

  if p_workout_id is null then
    insert into public.workouts (user_id, workout_date, activity, duration_minutes, intensity, notes, discipline)
    values (v_user_id, p_workout_date, 'Running', greatest(1, round(p_duration_seconds / 60.0)::integer), p_intensity, nullif(p_notes, ''), 'running')
    returning id into v_workout_id;
  else
    select discipline into v_existing_discipline
    from public.workouts where id = p_workout_id and user_id = v_user_id for update;
    if not found then raise exception 'Workout not found' using errcode = 'P0002'; end if;
    if v_existing_discipline is distinct from 'running' then
      raise exception 'Workout is not a Running session' using errcode = '22023';
    end if;
    if not exists (select 1 from public.running_sessions where workout_id = p_workout_id and user_id = v_user_id) then
      raise exception 'Running details not found' using errcode = 'P0002';
    end if;
    update public.workouts set workout_date = p_workout_date, duration_minutes = greatest(1, round(p_duration_seconds / 60.0)::integer), intensity = p_intensity,
      notes = nullif(p_notes, '') where id = p_workout_id and user_id = v_user_id;
    v_workout_id := p_workout_id;
  end if;

  insert into public.running_sessions (
    workout_id, user_id, name, run_type, distance_km, duration_seconds,
    elevation_gain_m, average_heart_rate, cadence_spm
  ) values (
    v_workout_id, v_user_id, p_name, p_run_type, p_distance_km, p_duration_seconds,
    p_elevation_gain_m, p_average_heart_rate, p_cadence_spm
  ) on conflict (workout_id) do update set
    name = excluded.name, run_type = excluded.run_type, distance_km = excluded.distance_km,
    duration_seconds = excluded.duration_seconds, elevation_gain_m = excluded.elevation_gain_m,
    average_heart_rate = excluded.average_heart_rate, cadence_spm = excluded.cadence_spm;

  return v_workout_id;
end;
$$;

create function public.delete_running_session(p_workout_id uuid) returns date
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_workout_date date;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  delete from public.workouts
  where id = p_workout_id and user_id = v_user_id and discipline = 'running'
  returning workout_date into v_workout_date;
  if not found then raise exception 'Running session not found' using errcode = 'P0002'; end if;
  return v_workout_date;
end;
$$;

revoke all on function public.save_running_session(uuid, date, text, text, numeric, integer, integer, text, integer, integer, integer) from public, anon, service_role;
grant execute on function public.save_running_session(uuid, date, text, text, numeric, integer, integer, text, integer, integer, integer) to authenticated;
revoke all on function public.delete_running_session(uuid) from public, anon, service_role;
grant execute on function public.delete_running_session(uuid) to authenticated;

commit;
