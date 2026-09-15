-- Adds fixed weekly scheduling to habits (e.g. Monday/Wednesday/Friday).
-- 1 = Monday ... 7 = Sunday. Existing habits default to every day.

alter table public.habits
  add column if not exists scheduled_days smallint[] not null default '{1,2,3,4,5,6,7}';
