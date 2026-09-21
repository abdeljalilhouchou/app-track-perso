-- Marks habit check-ins created automatically (e.g. by logging a sport session), so they can be
-- undone if that session is deleted without touching check-ins the user made by hand.
alter table public.habit_logs add column if not exists source text;
