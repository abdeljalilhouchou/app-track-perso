-- Extends nutrition with: fiber/sugar/sodium, default portions, body weight
-- log, water log, and meal templates (saved combos of foods).

alter table public.foods add column if not exists fiber numeric(6, 1) not null default 0;
alter table public.foods add column if not exists sugar numeric(6, 1) not null default 0;
alter table public.foods add column if not exists sodium numeric(6, 1) not null default 0;
alter table public.foods add column if not exists portion_label text;
alter table public.foods add column if not exists portion_grams numeric(7, 1);

alter table public.meal_entries add column if not exists fiber numeric(6, 1) not null default 0;
alter table public.meal_entries add column if not exists sugar numeric(6, 1) not null default 0;
alter table public.meal_entries add column if not exists sodium numeric(6, 1) not null default 0;

create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  weight_kg numeric(5, 1) not null,
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

alter table public.weight_logs enable row level security;

create policy "Weight logs are managed by owner" on public.weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.water_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  ml int not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);

alter table public.water_logs enable row level security;

create policy "Water logs are managed by owner" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '🍽️',
  created_at timestamptz not null default now()
);

alter table public.meal_templates enable row level security;

create policy "Meal templates are managed by owner" on public.meal_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.meal_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.meal_templates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  food_name text not null,
  icon text not null default '🍽️',
  quantity_grams numeric(7, 1) not null,
  calories numeric(7, 1) not null,
  protein numeric(6, 1) not null default 0,
  carbs numeric(6, 1) not null default 0,
  fat numeric(6, 1) not null default 0,
  fiber numeric(6, 1) not null default 0,
  sugar numeric(6, 1) not null default 0,
  sodium numeric(6, 1) not null default 0
);

alter table public.meal_template_items enable row level security;

create policy "Meal template items are managed by owner" on public.meal_template_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists weight_logs_user_date_idx on public.weight_logs (user_id, entry_date);
create index if not exists meal_template_items_template_idx on public.meal_template_items (template_id);
