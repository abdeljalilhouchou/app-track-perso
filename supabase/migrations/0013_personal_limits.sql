-- Per-user daily limits (previously hard-coded for everyone).
alter table public.profiles add column if not exists water_goal_ml int not null default 2000;
alter table public.profiles add column if not exists caffeine_limit_mg int not null default 400;
