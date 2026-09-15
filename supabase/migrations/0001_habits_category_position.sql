-- Adds category + manual ordering support to existing habits tables.
-- Safe to run even if columns already exist.

alter table public.habits add column if not exists category text not null default 'Général';
alter table public.habits add column if not exists position int not null default 0;

-- Give existing habits a stable initial order based on creation date.
with ordered as (
  select id, row_number() over (partition by user_id order by created_at asc) - 1 as rn
  from public.habits
)
update public.habits h
set position = ordered.rn
from ordered
where h.id = ordered.id;
