-- Optional duration and price for moments (e.g. "Café avec Sarah, 45 min, 8€").

alter table public.moments add column if not exists duration_minutes int;
alter table public.moments add column if not exists price numeric(10, 2);
