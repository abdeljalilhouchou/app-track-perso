-- Adds liquids (ml) and caffeine tracking: a unit per food/entry and a caffeine
-- amount (mg per 100 g/ml on foods, mg total on entries).

alter table public.foods add column if not exists unit text not null default 'g' check (unit in ('g', 'ml'));
alter table public.foods add column if not exists caffeine numeric(6, 1) not null default 0;

alter table public.meal_entries add column if not exists unit text not null default 'g' check (unit in ('g', 'ml'));
alter table public.meal_entries add column if not exists caffeine numeric(6, 1) not null default 0;

alter table public.meal_template_items add column if not exists unit text not null default 'g' check (unit in ('g', 'ml'));
alter table public.meal_template_items add column if not exists caffeine numeric(6, 1) not null default 0;
