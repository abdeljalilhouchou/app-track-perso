-- Adds an optional note to each habit check-in, so tracking can double as a journal.

alter table public.habit_logs add column if not exists note text;
