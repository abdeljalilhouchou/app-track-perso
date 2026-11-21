-- Habits v2: counted and "avoid" habits, moments of the day, per-habit reminder time,
-- automatic check-in sources, a weekly joker, counter values and joker days on logs.
-- Additive only: existing habits keep behaving exactly as before (kind 'check', no goal,
-- moment 'any', no reminder, no automatic source, joker allowed). Review and apply manually,
-- BEFORE deploying the code that uses these columns.

begin;

alter table public.habits
  add column if not exists kind text not null default 'check',
  add column if not exists goal_value numeric(10, 2),
  add column if not exists goal_unit text,
  add column if not exists moment text not null default 'any',
  add column if not exists reminder_time time,
  add column if not exists auto_source text,
  add column if not exists joker_enabled boolean not null default true,
  add column if not exists paused_at timestamptz;

alter table public.habits drop constraint if exists habits_kind_check;
alter table public.habits add constraint habits_kind_check check (kind in ('check', 'count', 'avoid'));

alter table public.habits drop constraint if exists habits_goal_check;
alter table public.habits add constraint habits_goal_check check (
  (kind = 'count' and goal_value is not null and goal_value > 0 and goal_value <= 100000)
  or (kind <> 'count' and goal_value is null)
);

alter table public.habits drop constraint if exists habits_goal_unit_check;
alter table public.habits add constraint habits_goal_unit_check check (goal_unit is null or char_length(goal_unit) <= 20);

alter table public.habits drop constraint if exists habits_moment_check;
alter table public.habits add constraint habits_moment_check check (moment in ('morning', 'afternoon', 'evening', 'any'));

alter table public.habits drop constraint if exists habits_auto_source_check;
alter table public.habits add constraint habits_auto_source_check check (auto_source is null or auto_source in ('sport', 'water', 'mood'));

alter table public.habit_logs
  add column if not exists value numeric(10, 2),
  add column if not exists is_joker boolean not null default false;

alter table public.habit_logs drop constraint if exists habit_logs_value_check;
alter table public.habit_logs add constraint habit_logs_value_check check (value is null or (value >= 0 and value <= 100000));

-- Habits already in the Sport category were checked by sport sessions: keep that explicit.
update public.habits set auto_source = 'sport' where category = 'Sport' and auto_source is null;

commit;
